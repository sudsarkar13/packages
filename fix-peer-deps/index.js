#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';

const VERSION = '1.1.0';

const HELP_TEXT = `
${chalk.bold.cyan('fix-peer-deps')} - A tool to analyze and fix peer dependency issues

${chalk.bold('USAGE')}
  $ npx fix-peer-deps [options]

${chalk.bold('OPTIONS')}
  ${chalk.yellow('--fix')}        Automatically fix peer dependency issues by installing missing dependencies
  ${chalk.yellow('-h, --help')}   Show this help message
  ${chalk.yellow('-v, --version')} Show version number
  
${chalk.bold('EXAMPLES')}
  $ npx fix-peer-deps              ${chalk.dim('# Analyze and show suggestions')}
  $ npx fix-peer-deps --fix        ${chalk.dim('# Analyze and automatically fix issues')}
  $ npx fix-peer-deps --help       ${chalk.dim('# Show this help message')}
  $ npx fix-peer-deps --version    ${chalk.dim('# Show version number')}

${chalk.bold('VERSION')}
  ${VERSION}
`;

const log = {
  info: (msg) => console.log(chalk.blue('ℹ️  ') + msg),
  success: (msg) => console.log(chalk.green('✅ ') + msg),
  warning: (msg) => console.log(chalk.yellow('⚠️  ') + msg),
  error: (msg) => console.log(chalk.red('❌ ') + msg),
  title: (msg) => console.log('\n' + chalk.bold.cyan(msg) + '\n')
};

async function getPackageManager() {
  const userAgent = process.env.npm_config_user_agent;
  if (userAgent) {
    if (userAgent.startsWith('yarn')) return 'yarn';
    if (userAgent.startsWith('pnpm')) return 'pnpm';
    if (userAgent.startsWith('npm')) return 'npm';
    if (userAgent.startsWith('bun')) return 'bun';
  }
  
  // Fallback detection based on lock files
  try {
    const files = await fs.readdir(process.cwd());
    if (files.includes('yarn.lock')) return 'yarn';
    if (files.includes('pnpm-lock.yaml')) return 'pnpm';
    if (files.includes('package-lock.json')) return 'npm';
    if (files.includes('bun.lockb')) return 'bun';
  } catch (err) {
    log.error('Unable to detect package manager from lock files');
  }
  
  return 'npm'; // Default to npm
}

async function analyzePeerDependencies(packageManager) {
  const spinner = ora('Analyzing peer dependencies...').start();
  let issues = [];

  try {
    switch (packageManager) {
      case 'yarn':
        const yarnOutput = execSync('yarn explain peer-requirements', { encoding: 'utf8' });
        issues = yarnOutput.split('\n')
          .filter(line => line.includes("doesn't provide") || line.includes("doesn't satisfy"))
          .map(line => ({ type: 'yarn', message: line.trim() }));
        break;

      case 'npm':
        const npmOutput = execSync('npm ls', { encoding: 'utf8' });
        issues = npmOutput.split('\n')
          .filter(line => line.includes('peer dep missing'))
          .map(line => ({ type: 'npm', message: line.trim() }));
        break;

      case 'pnpm':
        const pnpmOutput = execSync('pnpm ls', { encoding: 'utf8' });
        issues = pnpmOutput.split('\n')
          .filter(line => line.includes('peer dependencies'))
          .map(line => ({ type: 'pnpm', message: line.trim() }));
        break;

      case 'bun':
        const bunOutput = execSync('bun pm ls', { encoding: 'utf8' });
        issues = bunOutput.split('\n')
          .filter(line => line.includes('missing peer'))
          .map(line => ({ type: 'bun', message: line.trim() }));
        break;

      default:
        throw new Error('Unsupported package manager');
    }

    spinner.succeed('Analysis complete');
    return issues;
  } catch (error) {
    spinner.fail('Analysis failed');
    throw error;
  }
}

async function suggestFixes(issues, packageManager) {
  const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
  const suggestions = new Map();

  log.title('📋 Analysis Results');

  if (issues.length === 0) {
    log.success('No peer dependency issues detected!');
    return;
  }

  log.info(`Found ${chalk.bold(issues.length)} peer dependency issues:`);
  
  const progressBar = new cliProgress.SingleBar({
    format: 'Analyzing Issues |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} Issues',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  });

  progressBar.start(issues.length, 0);

  for (const issue of issues) {
    let match;
    switch (issue.type) {
      case 'yarn':
        match = issue.message.match(/(\S+)@npm:(\S+) doesn't provide (\S+) to (\S+)@npm:(\S+)/);
        if (match) {
          const [, provider, providerVersion, missing, requester, requesterVersion] = match;
          if (!suggestions.has(missing)) {
            suggestions.set(missing, new Set());
          }
          suggestions.get(missing).add(`${requester}@${requesterVersion}`);
        }
        break;
      // Add parsing logic for other package managers here
    }
    progressBar.increment();
  }

  progressBar.stop();

  log.title('🔧 Suggested Fixes');

  for (const [missing, requesters] of suggestions) {
    log.info(`\nMissing Dependency: ${chalk.bold(missing)}`);
    console.log(chalk.dim('Required by:'));
    for (const requester of requesters) {
      console.log(chalk.dim('  • ') + requester);
    }

    const installCmd = getInstallCommand(packageManager, missing);
    console.log('\nTo fix, run:');
    console.log(chalk.cyan(`  ${installCmd}`));
  }

  log.title('📝 Additional Steps');
  log.info(`1. After installing dependencies, run: ${chalk.cyan(getUpdateCommand(packageManager))}`);
  log.info('2. If issues persist, add resolutions to package.json:');
  console.log(chalk.dim(`
    "resolutions": {
      "<package>": "<version>"
    }
  `));
}

async function executeCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log.error(`Failed to execute command: ${command}`);
    log.error(error.message);
    return false;
  }
}

async function autoFix(issues, packageManager) {
  log.title('🔧 Automatic Fix Mode');
  
  if (issues.length === 0) {
    log.success('No issues to fix!');
    return true;
  }

  log.info(`Found ${chalk.bold(issues.length)} issues to fix`);
  
  const spinner = ora('Installing missing dependencies...').start();
  const suggestions = new Map();
  let success = true;

  // Collect all missing dependencies
  for (const issue of issues) {
    let match;
    switch (issue.type) {
      case 'yarn':
        match = issue.message.match(/(\S+)@npm:(\S+) doesn't provide (\S+) to (\S+)@npm:(\S+)/);
        if (match) {
          const [, , , missing] = match;
          suggestions.set(missing, true);
        }
        break;
      // Add parsing logic for other package managers
    }
  }

  // Install all missing dependencies
  for (const [pkg] of suggestions) {
    const installCmd = getInstallCommand(packageManager, pkg);
    spinner.text = `Installing ${pkg}...`;
    
    if (!await executeCommand(installCmd)) {
      success = false;
      spinner.fail(`Failed to install ${pkg}`);
      continue;
    }
  }

  // Update dependencies
  spinner.text = 'Updating dependencies...';
  const updateCmd = getUpdateCommand(packageManager);
  if (!await executeCommand(updateCmd)) {
    success = false;
    spinner.fail('Failed to update dependencies');
  }

  if (success) {
    spinner.succeed('All dependencies installed and updated successfully');
    log.success('Fixed all peer dependency issues!');
  } else {
    spinner.fail('Some issues could not be fixed automatically');
    log.warning('Please review the errors above and try to fix them manually');
  }

  return success;
}

function getInstallCommand(packageManager, pkg) {
  switch (packageManager) {
    case 'yarn':
      return `yarn add ${pkg} --dev`;
    case 'npm':
      return `npm install ${pkg} --save-dev`;
    case 'pnpm':
      return `pnpm add ${pkg} --save-dev`;
    case 'bun':
      return `bun add ${pkg} --dev`;
    default:
      return `npm install ${pkg} --save-dev`;
  }
}

function getUpdateCommand(packageManager) {
  switch (packageManager) {
    case 'yarn':
      return 'yarn install';
    case 'npm':
      return 'npm install';
    case 'pnpm':
      return 'pnpm install';
    case 'bun':
      return 'bun install';
    default:
      return 'npm install';
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

  console.log(chalk.bold.cyan('\n🔍 Fix Peer Dependencies Tool\n'));
  
  try {
    const packageManager = await getPackageManager();
    log.info(`Detected package manager: ${chalk.bold(packageManager)}`);

    const issues = await analyzePeerDependencies(packageManager);

    if (autoFixMode) {
      await autoFix(issues, packageManager);
    } else {
      await suggestFixes(issues, packageManager);

      if (issues.length === 0) {
        log.success('All peer dependencies are properly configured! 🎉');
      } else {
        log.warning(`Found ${issues.length} issues that need attention`);
        log.info(`Run with ${chalk.yellow('--fix')} to automatically fix these issues`);
      }
    }
  } catch (err) {
    log.error('An error occurred:');
    console.error(chalk.red(err.message));
    process.exit(1);
  }
}

main();