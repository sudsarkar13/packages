#!/usr/bin/env node

import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { execa } from 'execa';
import ora from 'ora';
import semver from 'semver';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const VERSION = '1.1.2';  // Match with package.json

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

async function detectPackageManager() {
    const spinner = ora('Detecting package manager...').start();
    const files = ['yarn.lock', 'package-lock.json', 'pnpm-lock.yaml', 'bun.lockb'];
    
    try {
        // First check if we're in a Node.js project
        const packageJsonPath = resolve(process.cwd(), 'package.json');
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
        
        // Check packageManager field first
        if (packageJson.packageManager) {
            const [name] = packageJson.packageManager.split('@');
            spinner.succeed(`Detected package manager from package.json: ${name}`);
            return name;
        }

        // Then check for lock files
        for (const file of files) {
            try {
                await readFile(resolve(process.cwd(), file));
                const name = file.split('.')[0];
                spinner.succeed(`Detected package manager from lock file: ${name}`);
                return name;
            } catch {}
        }
        
        // Default to npm if no specific manager is detected
        spinner.succeed('No specific package manager detected, using npm');
        return 'npm';
    } catch (error) {
        spinner.fail('No package.json found in current directory');
        console.error(chalk.red('\nError: This command must be run in a Node.js project directory'));
        console.error(chalk.dim('Make sure you are in a directory with a package.json file'));
        process.exit(1);
    }
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

async function checkDeepPeerDependencies(name, info, dependencies, visited = new Set()) {
    if (visited.has(name)) return [];
    visited.add(name);
    
    const issues = [];
    
    // Check direct peer dependencies
    if (info.peerDependencies) {
        for (const [peer, version] of Object.entries(info.peerDependencies)) {
            if (IGNORE_PATTERNS.some(pattern => pattern.test(peer))) continue;
            
            const isOptional = OPTIONAL_DEPS.includes(peer);
            const peerInfo = dependencies[peer];
            
            if (!peerInfo) {
                issues.push({
                    packageName: name,
                    peer,
                    required: version,
                    current: 'missing',
                    isOptional,
                    type: 'missing'
                });
            } else {
                // Check version compatibility
                const currentVersion = peerInfo.version;
                const hasIntersection = semver.intersects(currentVersion, version);
                const satisfies = semver.satisfies(currentVersion, version);
                
                if (!satisfies) {
                    issues.push({
                        packageName: name,
                        peer,
                        required: version,
                        current: currentVersion,
                        isOptional,
                        type: hasIntersection ? 'warning' : 'error',
                        detail: hasIntersection ? 
                            'Versions intersect but don\'t fully satisfy requirements' :
                            'No compatible versions found'
                    });
                }
                
                // Recursively check peer dependencies
                const deepIssues = await checkDeepPeerDependencies(peer, peerInfo, dependencies, visited);
                issues.push(...deepIssues);
            }
        }
    }
    
    return issues;
}

async function analyzePeerDependencies() {
    const spinner = ora('Analyzing dependencies...').start();
    
    try {
        const packageManager = await detectPackageManager();
        const deps = await getDependencies(packageManager);
        
        // Analyze peer dependencies
        const issues = [];
        const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        
        const dependencies = deps.dependencies || {};
        progress.start(Object.keys(dependencies).length, 0);
        
        for (const [name, info] of Object.entries(dependencies)) {
            const deepIssues = await checkDeepPeerDependencies(name, info, dependencies);
            issues.push(...deepIssues);
            progress.increment();
        }
        
        progress.stop();
        spinner.succeed('Analysis complete');
        
        // Group and deduplicate issues
        const uniqueIssues = Array.from(new Set(issues.map(JSON.stringify))).map(JSON.parse);
        const groupedIssues = {
            errors: uniqueIssues.filter(i => !i.isOptional && i.type === 'error'),
            warnings: uniqueIssues.filter(i => !i.isOptional && i.type === 'warning'),
            optional: uniqueIssues.filter(i => i.isOptional)
        };
        
        return { issues: groupedIssues, packageManager };
    } catch (error) {
        spinner.fail('Analysis failed');
        console.error(chalk.red(`\nError: ${error.message}`));
        if (error.stderr) {
            console.error(chalk.dim(error.stderr));
        }
        process.exit(1);
    }
}

async function autoFix(issues, packageManager) {
    console.log(chalk.bold('\n🔧 Automatic Fix Mode\n'));
    
    if (issues.errors.length === 0 && issues.warnings.length === 0) {
        console.log(chalk.green('✨ No issues to fix!'));
        return;
    }

    const command = packageManager === 'yarn' ? 'yarn add' : 
                   packageManager === 'pnpm' ? 'pnpm add' : 'npm install';
    
    const spinner = ora('Installing missing dependencies...').start();
    
    try {
        const depsToInstall = issues.errors.map(i => `${i.peer}@"${i.required}"`);
        
        // Split installation into chunks to avoid command line length limits
        const chunkSize = 10;
        for (let i = 0; i < depsToInstall.length; i += chunkSize) {
            const chunk = depsToInstall.slice(i, i + chunkSize);
            spinner.text = `Installing dependencies (${i + 1}-${Math.min(i + chunkSize, depsToInstall.length)} of ${depsToInstall.length})...`;
            await execa(command.split(' ')[0], [...command.split(' ').slice(1), ...chunk]);
        }
        
        spinner.succeed('Successfully installed missing dependencies');
        
        // Run package manager's install command to ensure everything is properly linked
        spinner.start('Updating dependencies...');
        await execa(packageManager, ['install']);
        spinner.succeed('Dependencies updated successfully');
        
        console.log(chalk.green('\n✨ Fixed all critical peer dependency issues!'));
        
        if (issues.optional.length > 0) {
            console.log(chalk.yellow('\nℹ️  Note: Some optional dependencies were skipped.'));
            console.log(chalk.gray('These are typically development dependencies that may improve your development experience.'));
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
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('-h') || args.includes('--help')) {
        console.log(HELP_TEXT);
        return;
    }

    if (args.includes('-v') || args.includes('--version')) {
        console.log(chalk.bold.cyan(`fix-peer-deps v${VERSION}`));
        return;
    }

    const autoFixMode = args.includes('--fix');
    
    console.log(chalk.bold('\n🔍 Fix Peer Dependencies Tool\n'));
    
    const { issues, packageManager } = await analyzePeerDependencies();
    
    if (autoFixMode) {
        await autoFix(issues, packageManager);
        return;
    }
    
    if (issues.errors.length === 0 && issues.warnings.length === 0 && issues.optional.length === 0) {
        console.log(chalk.green('\n✨ No peer dependency issues found!'));
        return;
    }

    // Summary
    console.log(chalk.bold('\n📊 Dependency Analysis Summary'));
    console.log('─'.repeat(50));
    console.log(`${chalk.red('Critical Issues:')}    ${issues.errors.length}`);
    console.log(`${chalk.yellow('Version Warnings:')} ${issues.warnings.length}`);
    console.log(`${chalk.blue('Optional Issues:')}   ${issues.optional.length}`);
    console.log('─'.repeat(50));

    // Critical Issues
    if (issues.errors.length > 0) {
        console.log(chalk.red('\n🚨 Critical Issues'));
        console.log('═'.repeat(50));
        console.log(formatDependencyTree(issues.errors));
    }

    // Warnings
    if (issues.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Version Warnings'));
        console.log('═'.repeat(50));
        console.log(formatDependencyTree(issues.warnings));
    }

    // Optional Issues
    if (issues.optional.length > 0) {
        console.log(chalk.blue('\n💡 Optional Improvements'));
        console.log('═'.repeat(50));
        console.log(formatDependencyTree(issues.optional));
    }

    // Suggested Actions
    if (issues.errors.length > 0 || issues.warnings.length > 0) {
        console.log(chalk.cyan('\n📝 Suggested Actions'));
        console.log('═'.repeat(50));
        
        if (issues.errors.length > 0) {
            console.log(chalk.bold('\nCritical Fixes:'));
            console.log(chalk.white(formatSuggestedActions(issues.errors, packageManager)));
        }
        
        if (issues.warnings.length > 0) {
            console.log(chalk.bold('\nRecommended Updates:'));
            console.log(chalk.gray(formatSuggestedActions(issues.warnings, packageManager)));
        }
        
        console.log(chalk.yellow('\n💡 Quick Fix:'));
        console.log(chalk.cyan('fix-peer-deps --fix'));
    }

    // Tips
    console.log(chalk.magenta('\n💭 Tips'));
    console.log('═'.repeat(50));
    console.log('• Use --fix to automatically resolve critical issues');
    console.log('• Optional dependencies can improve development experience');
    console.log('• Check package documentation for compatibility details');
}

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nOperation cancelled by user'));
    process.exit(0);
});

// Export functions for programmatic use (RunKit, etc.)
export {
  analyzePeerDependencies,
  detectPackageManager,
  checkDeepPeerDependencies,
  autoFix
};

// Only run main if this is called directly (not imported as a module)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red(`\nError: ${error.message}`));
    if (error.stderr) {
        console.error(chalk.dim(error.stderr));
    }
    process.exit(1);
  });
}