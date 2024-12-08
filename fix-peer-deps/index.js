#!/usr/bin/env node

import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { execa } from 'execa';
import ora from 'ora';
import semver from 'semver';
import { readFile, readdir } from 'fs/promises';
import { resolve, join } from 'path';

const VERSION = '1.1.7';  // Match with package.json

const IGNORE_PATTERNS = [
    /^@types\//,  // Ignore TypeScript type definitions
    /^@babel\//,  // Ignore Babel plugins
    /^@eslint\//  // Ignore ESLint plugins
];

const OPTIONAL_DEPS = [
    'supports-color',
    'encoding',
    'ts-node'
];

const HELP_TEXT = `
${chalk.bold.cyan('fix-peer-deps')} - A tool to analyze and fix peer dependency issues

${chalk.bold('USAGE')}
  $ fix-peer-deps [options]

${chalk.bold('OPTIONS')}
  ${chalk.yellow('--fix')}        Automatically fix peer dependency issues by installing missing dependencies
  ${chalk.yellow('-h, --help')}   Show this help message
  ${chalk.yellow('-v, --version')} Show version number
  
${chalk.bold('EXAMPLES')}
  $ fix-peer-deps              ${chalk.dim('# Analyze and show suggestions')}
  $ fix-peer-deps --fix        ${chalk.dim('# Analyze and automatically fix issues')}
  $ fix-peer-deps --help       ${chalk.dim('# Show this help message')}
  $ fix-peer-deps --version    ${chalk.dim('# Show version number')}

${chalk.bold('VERSION')}
  ${VERSION}
`;

// Process command line arguments first
const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
    console.log(HELP_TEXT);
    process.exit(0);
}

if (args.includes('-v') || args.includes('--version')) {
    console.log(`fix-peer-deps v${VERSION}`);
    process.exit(0);
}

async function detectPackageManager(cwd) {
    const files = await readdir(cwd);
    
    // Check for lock files first
    if (files.includes('yarn.lock')) return 'yarn';
    if (files.includes('package-lock.json')) return 'npm';
    if (files.includes('pnpm-lock.yaml')) return 'pnpm';
    if (files.includes('bun.lockb')) return 'bun';

    // Check for packageManager field in package.json
    try {
        const packageJson = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8'));
        if (packageJson.packageManager) {
            const manager = packageJson.packageManager.split('@')[0];
            if (['npm', 'yarn', 'pnpm', 'bun'].includes(manager)) {
                return manager;
            }
        }
    } catch (error) {
        console.debug('Error reading package.json:', error.message);
    }

    // Check environment variables
    if (process.env.npm_execpath) {
        if (process.env.npm_execpath.includes('yarn')) return 'yarn';
        if (process.env.npm_execpath.includes('pnpm')) return 'pnpm';
        if (process.env.npm_execpath.includes('bun')) return 'bun';
        return 'npm';
    }

    console.debug('No specific package manager detected, using npm as default');
    return 'npm';
}

async function analyzeDependencies(packageJson) {
    const deps = new Set();
    const missingPeerDeps = new Set();
    const versionConflicts = new Set();

    // Helper to check and add dependencies
    const addDependencies = (dependencies) => {
        if (!dependencies) return;
        Object.entries(dependencies).forEach(([name, version]) => {
            deps.add(`${name}@${version}`);
        });
    };

    // Add all types of dependencies
    addDependencies(packageJson.dependencies);
    addDependencies(packageJson.devDependencies);
    addDependencies(packageJson.peerDependencies);

    // First install dependencies if node_modules doesn't exist
    const nodeModulesPath = `${process.cwd()}/node_modules`;
    try {
        await readdir(nodeModulesPath);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Installing dependencies first...');
            try {
                await execa('npm', ['install', '--legacy-peer-deps']);
            } catch (installError) {
                console.error('Failed to install dependencies:', installError.message);
                return { missingPeerDeps: [], versionConflicts: [] };
            }
        }
    }

    // Check for missing peer dependencies and version conflicts
    for (const dep of deps) {
        try {
            const [name, version] = dep.split('@');
            const packagePath = `${nodeModulesPath}/${name}/package.json`;
            const depPackageJson = JSON.parse(await readFile(packagePath, 'utf8'));
            
            if (depPackageJson.peerDependencies) {
                Object.entries(depPackageJson.peerDependencies).forEach(([peerName, requiredVersion]) => {
                    const installedPeerDep = Array.from(deps).find(d => {
                        const [name] = d.split('@');
                        return name === peerName;
                    });

                    if (!installedPeerDep) {
                        missingPeerDeps.add(`${peerName}@${requiredVersion}`);
                    } else {
                        const [, installedVersion] = installedPeerDep.split('@');
                        const cleanInstalled = semver.valid(semver.coerce(installedVersion));
                        const cleanRequired = semver.valid(semver.coerce(requiredVersion));

                        if (cleanInstalled && cleanRequired && !semver.satisfies(cleanInstalled, requiredVersion)) {
                            versionConflicts.add({
                                package: name,
                                peer: peerName,
                                required: requiredVersion,
                                installed: installedVersion
                            });
                        }
                    }
                });
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.debug(`Error checking peer dependencies for ${dep}:`, error.message);
            }
        }
    }

    return {
        missingPeerDeps: Array.from(missingPeerDeps),
        versionConflicts: Array.from(versionConflicts)
    };
}

async function getDependencies(packageManager) {
    const spinner = ora('Reading package information...').start();
    
    try {
        // Read package.json first
        const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
        const dependencies = packageJson.dependencies || {};
        
        // Try to get installed versions from package-lock.json or npm list
        let installedVersions = {};
        try {
            const packageLock = JSON.parse(await readFile('package-lock.json', 'utf8'));
            installedVersions = packageLock.dependencies || {};
        } catch (e) {
            try {
                const { stdout } = await execa('npm', ['list', '--json', '--all']);
                const npmList = JSON.parse(stdout);
                installedVersions = npmList.dependencies || {};
            } catch (listError) {
                // If npm list fails, we'll use the versions from package.json
                spinner.warn('Using versions from package.json');
            }
        }
        
        // Convert to our internal format
        const result = {};
        for (const [name, version] of Object.entries(dependencies)) {
            result[name] = {
                version: version.replace(/^\^|~/, ''),
                name,
                peerDependencies: {}
            };
            
            // Try to get peer dependencies
            try {
                const { stdout } = await execa('npm', ['view', `${name}@${version}`, 'peerDependencies', '--json']);
                result[name].peerDependencies = JSON.parse(stdout);
            } catch (e) {
                // If we can't get peer dependencies, continue without them
            }
        }
        
        spinner.succeed('Package information loaded');
        return { dependencies: result };
    } catch (error) {
        spinner.fail('Failed to read package information');
        throw error;
    }
}

async function analyzePeerDependencies(dependencies, onProgress) {
    const spinner = ora('Analyzing dependencies...').start();
    
    try {
        const { missingPeerDeps, versionConflicts } = await analyzeDependencies(dependencies);
        
        if (missingPeerDeps.length > 0) {
            spinner.warn('Found missing peer dependencies');
            console.log('\nMissing peer dependencies:');
            missingPeerDeps.forEach(dep => console.log(chalk.yellow(`- ${dep}`)));
        }
        
        if (versionConflicts.length > 0) {
            spinner.warn('Found version conflicts');
            console.log('\nVersion conflicts:');
            versionConflicts.forEach(conflict => {
                console.log(chalk.yellow(`- ${conflict.package} requires ${conflict.peer}@${conflict.required}, but ${conflict.installed} is installed`));
            });
        }

        if (missingPeerDeps.length === 0 && versionConflicts.length === 0) {
            spinner.succeed('No peer dependency issues found');
        }

        return { missingPeerDeps, versionConflicts };
    } catch (error) {
        spinner.fail('Error analyzing dependencies');
        console.error(chalk.red(error.message));
        throw error;
    }
}

async function autoFix(issues, packageManager) {
    console.log(chalk.bold('\n🔧 Automatic Fix Mode\n'));
    
    if (!issues || !issues.missingPeerDeps || issues.missingPeerDeps.length === 0) {
        console.log(chalk.green('✨ No issues to fix!'));
        return;
    }

    const spinner = ora('Installing missing dependencies...').start();
    
    try {
        // Format the version ranges properly
        const depsToInstall = issues.missingPeerDeps.map(i => {
            const version = i.split('@')[1];
            return `${i.split('@')[0]}@${version}`;
        });
        
        // Package manager specific install commands
        const commands = {
            npm: {
                cmd: 'npm',
                args: ['install', '--save-peer', '--legacy-peer-deps'],
                verifyCmd: 'npm',
                verifyArgs: ['ls', '--json']
            },
            yarn: {
                cmd: 'yarn',
                args: ['add', '--legacy-peer-deps'],
                verifyCmd: 'yarn',
                verifyArgs: ['list', '--json']
            },
            pnpm: {
                cmd: 'pnpm',
                args: ['add', '--save-peer'],
                verifyCmd: 'pnpm',
                verifyArgs: ['list', '--json']
            },
            bun: {
                cmd: 'bun',
                args: ['add'],
                verifyCmd: 'bun',
                verifyArgs: ['pm', 'ls', '--json']
            }
        };

        const command = commands[packageManager];
        if (!command) {
            throw new Error(`Unsupported package manager: ${packageManager}`);
        }

        // Install dependencies
        spinner.text = 'Installing missing dependencies...';
        try {
            await execa(command.cmd, [...command.args, ...depsToInstall]);
            spinner.succeed('Dependencies installed successfully');
        } catch (error) {
            spinner.warn('Failed to install dependencies with peer deps flag, trying without...');
            try {
                // Try without peer deps flag
                const baseArgs = command.args.filter(arg => !arg.includes('peer'));
                await execa(command.cmd, [...baseArgs, ...depsToInstall]);
                spinner.succeed('Dependencies installed successfully');
            } catch (retryError) {
                spinner.fail('Failed to install dependencies');
                throw retryError;
            }
        }

        // Verify installations
        spinner.start('Verifying installations...');
        try {
            const { stdout } = await execa(command.verifyCmd, command.verifyArgs);
            const deps = JSON.parse(stdout).dependencies || {};
            const missingDeps = depsToInstall.map(dep => dep.split('@')[0])
                                          .filter(dep => !deps[dep]);
            
            if (missingDeps.length > 0) {
                spinner.warn('Some dependencies were not installed correctly');
                console.log(chalk.yellow('\nThe following dependencies may need manual installation:'));
                missingDeps.forEach(dep => console.log(chalk.dim(`- ${dep}`)));
            } else {
                spinner.succeed('All dependencies installed successfully');
            }
        } catch (error) {
            spinner.warn('Unable to verify installations');
            console.error(chalk.dim(error.stderr || error.message));
        }

        console.log(chalk.green('\n✨ Fixed peer dependency issues!'));
        
        if (issues.versionConflicts && issues.versionConflicts.length > 0) {
            console.log(chalk.yellow('\nℹ️  Note: Some version conflicts were skipped.'));
            console.log(chalk.gray('These are typically version conflicts that may not affect your project.'));
        }
    } catch (error) {
        spinner.fail('Failed to fix dependencies');
        console.error(chalk.red(`\nError: ${error.message}`));
        if (error.stderr) {
            console.error(chalk.dim(error.stderr));
        }
        process.exit(1);
    }
}

function formatDependencyTree(issues) {
    const tree = {};
    
    // Build dependency tree
    issues.forEach(({ packageName, peer, required, current, type, detail }) => {
        if (!tree[packageName]) {
            tree[packageName] = { deps: [], type: type };
        }
        tree[packageName].deps.push({ peer, required, current, detail });
    });
    
    // Format tree output
    let output = '';
    for (const [pkg, info] of Object.entries(tree)) {
        const icon = info.type === 'error' ? '❌' : info.type === 'warning' ? '⚠️' : '📦';
        output += `${icon} ${chalk.bold(pkg)}\n`;
        info.deps.forEach(({ peer, required, current, detail }) => {
            output += `  ├─ ${chalk.cyan(peer)}\n`;
            output += `  │  Required: ${chalk.yellow(required)}\n`;
            output += `  │  Current:  ${current === 'missing' ? chalk.red(current) : chalk.gray(current)}\n`;
            if (detail) {
                output += `  │  Note:     ${chalk.dim(detail)}\n`;
            }
            output += `  │\n`;
        });
    }
    return output;
}

function formatSuggestedActions(issues, packageManager) {
    const command = packageManager === 'yarn' ? 'yarn add' : 
                   packageManager === 'pnpm' ? 'pnpm add' : 'npm install';
    
    let output = '';
    const depsByVersion = {};
    
    // Group by required versions
    issues.forEach(({ peer, required }) => {
        if (!depsByVersion[required]) {
            depsByVersion[required] = new Set();
        }
        depsByVersion[required].add(peer);
    });
    
    // Format commands
    Object.entries(depsByVersion).forEach(([version, peers]) => {
        const packages = Array.from(peers);
        if (packages.length === 1) {
            output += `${command} ${packages[0]}@"${version}"\n`;
        } else {
            output += `# Install compatible version for multiple packages\n`;
            output += `${command} ${packages.map(p => `${p}@"${version}"`).join(' ')}\n`;
        }
    });
    
    return output;
}

async function main() {
    console.log('\n🔍 Fix Peer Dependencies Tool\n');

    try {
        // Process version and help commands first
        if (process.argv.includes('-h') || process.argv.includes('--help')) {
            console.log(HELP_TEXT);
            return;
        }

        if (process.argv.includes('-v') || process.argv.includes('--version')) {
            console.log(`fix-peer-deps v${VERSION}`);
            return;
        }

        const packageManager = await detectPackageManager(process.cwd());
        if (!packageManager) {
            throw new Error('No package manager detected');
        }

        const dependencies = await getDependencies(packageManager);
        if (!dependencies) {
            throw new Error('Failed to get dependencies');
        }

        const spinner = ora('Analyzing dependencies...').start();
        
        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        
        const total = Object.keys(dependencies.dependencies).length;
        bar.start(total, 0);
        
        const issues = await analyzePeerDependencies(dependencies, (progress) => {
            bar.update(progress);
        });
        
        bar.stop();
        spinner.succeed('Analysis complete\n');

        if (process.argv.includes('--fix')) {
            await autoFix(issues, packageManager);
        } else if (issues.missingPeerDeps.length > 0 || issues.versionConflicts.length > 0) {
            console.log(formatDependencyTree(issues.missingPeerDeps));
            console.log(formatDependencyTree(issues.versionConflicts));
            console.log(formatSuggestedActions(issues.missingPeerDeps, packageManager));
            console.log(formatSuggestedActions(issues.versionConflicts, packageManager));
        } else {
            console.log(chalk.green('✨ No peer dependency issues found!'));
        }
    } catch (error) {
        console.error(chalk.red(`\nError: ${error.message}`));
        if (error.stderr) {
            console.error(chalk.dim(error.stderr));
        }
        process.exit(1);
    }
}

// Execute main function
main().catch(error => {
    console.error(chalk.red(`\nUnexpected error: ${error.message}`));
    if (error.stderr) {
        console.error(chalk.dim(error.stderr));
    }
    process.exit(1);
});