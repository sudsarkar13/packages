#!/usr/bin/env node

import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { execa } from 'execa';
import ora from 'ora';
import semver from 'semver';
import { readFile, readdir } from 'fs/promises';
import { resolve, join } from 'path';

const VERSION = '1.1.12';  // Match with package.json

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
    
    // Check for packageManager field in package.json first
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

    // Check for Yarn Berry (.yarn directory)
    if (files.includes('.yarn')) {
        return 'yarn';
    }
    
    // Check for lock files
    if (files.includes('yarn.lock')) return 'yarn';
    if (files.includes('package-lock.json')) return 'npm';
    if (files.includes('pnpm-lock.yaml')) return 'pnpm';
    if (files.includes('bun.lockb')) return 'bun';

    // Check environment variables
    if (process.env.npm_execpath) {
        if (process.env.npm_execpath.includes('yarn')) return 'yarn';
        if (process.env.npm_execpath.includes('pnpm')) return 'pnpm';
        if (process.env.npm_execpath.includes('bun')) return 'bun';
        return 'npm';
    }

    // Default to npm
    return 'npm';
}

async function getDependencies(packageManager) {
    const spinner = ora('Reading package information...').start();
    
    try {
        const packageJson = JSON.parse(
            await readFile(resolve(process.cwd(), 'package.json'), 'utf8')
        );

        const result = {
            dependencies: {},
            devDependencies: {},
            peerDependencies: {}
        };

        // Helper to process dependencies
        const processDeps = async (deps, type) => {
            if (!deps) return;
            for (const [name, version] of Object.entries(deps)) {
                result[type][name] = { version: version.replace(/^\^|~/, '') };
                
                if (packageManager === 'yarn') {
                    try {
                        const { stdout } = await execa('yarn', ['info', name, 'peerDependencies', '--json']);
                        const info = JSON.parse(stdout);
                        if (info.data) {
                            result[type][name].peerDependencies = info.data;
                        }
                    } catch (error) {
                        console.debug(`Error getting peer dependencies for ${name}:`, error.message);
                    }
                }
            }
        };

        // Process all dependency types
        await processDeps(packageJson.dependencies, 'dependencies');
        await processDeps(packageJson.devDependencies, 'devDependencies');
        await processDeps(packageJson.peerDependencies, 'peerDependencies');
        
        spinner.succeed('Package information loaded');
        return result;
    } catch (error) {
        spinner.fail('Failed to read package information');
        throw error;
    }
}

async function analyzePeerDependencies(dependencies, onProgress) {
    const spinner = ora('Analyzing dependencies...').start();
    
    try {
        const missingDeps = new Set();
        const versionConflicts = new Set();
        let total = 0;
        let current = 0;

        // Count total packages to analyze
        Object.values(dependencies).forEach(depType => {
            total += Object.keys(depType).length;
        });

        // Helper to check version compatibility
        const checkVersion = (name, required, installed) => {
            try {
                const cleanInstalled = semver.clean(installed) || installed;
                return semver.satisfies(cleanInstalled, required);
            } catch (error) {
                console.debug(`Error checking version for ${name}:`, error.message);
                return false;
            }
        };

        // Helper to find installed version across all dependency types
        const findInstalledVersion = (name) => {
            for (const depType of Object.values(dependencies)) {
                if (depType[name]) {
                    return depType[name].version;
                }
            }
            return null;
        };

        // Analyze all dependency types
        for (const [depType, deps] of Object.entries(dependencies)) {
            for (const [name, info] of Object.entries(deps)) {
                if (onProgress) {
                    onProgress(++current, total);
                }

                if (info.peerDependencies) {
                    for (const [peerName, requiredVersion] of Object.entries(info.peerDependencies)) {
                        const installedVersion = findInstalledVersion(peerName);
                        
                        if (!installedVersion) {
                            missingDeps.add(`${peerName}@${requiredVersion}`);
                        } else if (!checkVersion(peerName, requiredVersion, installedVersion)) {
                            versionConflicts.add(
                                `${name} requires ${peerName}@${requiredVersion}, but ${installedVersion} is installed`
                            );
                        }
                    }
                }
            }
        }

        spinner.succeed('Analysis complete');

        const uniqueMissingDeps = [...new Set(missingDeps)].sort();
        const uniqueVersionConflicts = [...new Set(versionConflicts)].sort();

        if (uniqueMissingDeps.length > 0) {
            console.log('\nMissing peer dependencies:');
            uniqueMissingDeps.forEach(dep => console.log(`- ${dep}`));
        }

        if (uniqueVersionConflicts.length > 0) {
            console.log('\nVersion conflicts:');
            uniqueVersionConflicts.forEach(conflict => console.log(`- ${conflict}`));
        }

        return {
            missingDeps: uniqueMissingDeps,
            versionConflicts: uniqueVersionConflicts,
            hasIssues: uniqueMissingDeps.length > 0 || uniqueVersionConflicts.length > 0
        };
    } catch (error) {
        spinner.fail('Analysis failed');
        throw error;
    }
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

async function autoFix(issues, packageManager) {
    console.log(chalk.bold('\n🔧 Automatic Fix Mode\n'));
    
    if (!issues || !issues.missingDeps || issues.missingDeps.length === 0) {
        console.log(chalk.green('✨ No issues to fix!'));
        return;
    }

    const spinner = ora('Installing missing dependencies...').start();
    
    try {
        // Format the version ranges properly
        const depsToInstall = issues.missingDeps
            .map(dep => {
                if (typeof dep === 'string') {
                    const [name, version] = dep.split('@');
                    return version ? `${name}@${version}` : name;
                }
                return null;
            })
            .filter(Boolean);

        if (depsToInstall.length === 0) {
            spinner.succeed('No dependencies to install');
            return;
        }

        // Package manager specific install commands
        const command = {
            npm: 'npm install',
            yarn: 'yarn add',
            pnpm: 'pnpm add',
            bun: 'bun add'
        }[packageManager] || 'npm install';

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

function formatDependencyTree(deps) {
    if (!deps || deps.length === 0) return '';

    let output = '\nMissing peer dependencies:\n';
    deps.forEach(dep => {
        if (typeof dep === 'string') {
            output += chalk.yellow(`- ${dep}\n`);
        } else if (dep.package && dep.peer) {
            output += chalk.yellow(`- ${dep.package} requires ${dep.peer}@${dep.required}\n`);
            output += chalk.gray(`  Current version: ${dep.installed}\n`);
        }
    });
    return output;
}

function formatSuggestedActions(deps, packageManager) {
    if (!deps || deps.length === 0) return '';

    const depsToInstall = deps
        .map(dep => {
            if (typeof dep === 'string') {
                const [name, version] = dep.split('@');
                return version ? `${name}@"${version}"` : name;
            }
            return null;
        })
        .filter(Boolean);

    if (depsToInstall.length === 0) return '';

    const command = {
        npm: 'npm install',
        yarn: 'yarn add',
        pnpm: 'pnpm add',
        bun: 'bun add'
    }[packageManager] || 'npm install';

    return `\nSuggested fix:\n${chalk.cyan(`${command} ${depsToInstall.join(' ')}`)}`;
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
        } else if (issues.missingDeps.length > 0 || issues.versionConflicts.length > 0) {
            console.log(formatDependencyTree(issues.missingDeps));
            console.log(formatDependencyTree(issues.versionConflicts));
            console.log(formatSuggestedActions(issues.missingDeps, packageManager));
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