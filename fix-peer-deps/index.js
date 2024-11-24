#!/usr/bin/env node

import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { execa } from 'execa';
import ora from 'ora';
import semver from 'semver';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const VERSION = '1.1.0';
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
    try {
        let cmd, args;
        switch (packageManager) {
            case 'yarn':
                cmd = 'yarn';
                args = ['list', '--json', '--depth=0'];
                break;
            case 'pnpm':
                cmd = 'pnpm';
                args = ['list', '--json', '--depth=0'];
                break;
            default: // npm and others
                cmd = 'npm';
                args = ['list', '--json', '--depth=0'];
        }

        const { stdout } = await execa(cmd, args);
        return JSON.parse(stdout);
    } catch (error) {
        // Handle case where the command fails but returns valid JSON
        if (error.stdout) {
            try {
                return JSON.parse(error.stdout);
            } catch {
                // If parsing fails, throw the original error
                throw error;
            }
        }
        throw error;
    }
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
            if (info.peerDependencies) {
                for (const [peer, version] of Object.entries(info.peerDependencies)) {
                    // Skip if matches ignore patterns
                    if (IGNORE_PATTERNS.some(pattern => pattern.test(peer))) continue;
                    
                    // Mark as optional if in OPTIONAL_DEPS
                    const isOptional = OPTIONAL_DEPS.includes(peer);
                    
                    const peerInfo = dependencies[peer];
                    if (!peerInfo || !semver.satisfies(peerInfo.version, version)) {
                        issues.push({
                            packageName: name,
                            peer,
                            required: version,
                            current: peerInfo?.version || 'missing',
                            isOptional
                        });
                    }
                }
            }
            progress.increment();
        }
        
        progress.stop();
        spinner.succeed('Analysis complete');
        
        return { issues, packageManager };
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
    
    if (issues.length === 0) {
        console.log(chalk.green('✨ No issues to fix!'));
        return;
    }

    const critical = issues.filter(i => !i.isOptional);
    const optional = issues.filter(i => i.isOptional);
    
    if (critical.length === 0) {
        console.log(chalk.yellow('ℹ️  Only optional dependencies found. No critical fixes needed.'));
        return;
    }

    const command = packageManager === 'yarn' ? 'yarn add' : 
                   packageManager === 'pnpm' ? 'pnpm add' : 'npm install';
    
    const spinner = ora('Installing missing dependencies...').start();
    
    try {
        const depsToInstall = critical.map(i => `${i.peer}@"${i.required}"`);
        
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
        
        if (optional.length > 0) {
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
    
    if (issues.length === 0) {
        console.log(chalk.green('✨ No peer dependency issues found!'));
        return;
    }
    
    // Group issues by severity
    const critical = issues.filter(i => !i.isOptional);
    const optional = issues.filter(i => i.isOptional);
    
    console.log(chalk.yellow(`\n📋 Found Issues:`));
    console.log(chalk.yellow(`• ${critical.length} critical issues`));
    console.log(chalk.gray(`• ${optional.length} optional issues`));
    
    if (critical.length > 0) {
        console.log(chalk.red('\n🚨 Critical Issues:'));
        critical.forEach(({ packageName, peer, required, current }) => {
            console.log(chalk.white(`\n${packageName} requires ${peer}@${required}`));
            console.log(chalk.gray(`Current: ${current}`));
        });
    }
    
    if (optional.length > 0) {
        console.log(chalk.yellow('\n⚠️  Optional Issues:'));
        optional.forEach(({ packageName, peer, required, current }) => {
            console.log(chalk.gray(`\n${packageName} optionally requires ${peer}@${required}`));
            console.log(chalk.gray(`Current: ${current}`));
        });
    }
    
    console.log(chalk.cyan('\n📝 Suggested Actions:'));
    
    if (critical.length > 0) {
        const command = packageManager === 'yarn' ? 'yarn add' : 
                       packageManager === 'pnpm' ? 'pnpm add' : 'npm install';
                       
        console.log(chalk.white('\nRun the following command to fix critical issues:'));
        console.log(chalk.cyan(`${command} ${critical.map(i => `${i.peer}@"${i.required}"`).join(' ')}`));
        console.log(chalk.yellow('\nOr run with --fix to automatically fix these issues:'));
        console.log(chalk.cyan('fix-peer-deps --fix'));
    }
    
    if (optional.length > 0) {
        console.log(chalk.gray('\nOptional dependencies can be installed if needed:'));
        console.log(chalk.gray(`These are typically development dependencies that may improve your development experience`));
    }
}

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nOperation cancelled by user'));
    process.exit(0);
});

main().catch(error => {
    console.error(chalk.red(`\nError: ${error.message}`));
    if (error.stderr) {
        console.error(chalk.dim(error.stderr));
    }
    process.exit(1);
});