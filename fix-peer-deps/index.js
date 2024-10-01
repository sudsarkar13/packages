#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

async function getPackageManager() {
  const userAgent = process.env.npm_config_user_agent;
  if (userAgent) {
    if (userAgent.startsWith('yarn')) return 'yarn';
    if (userAgent.startsWith('pnpm')) return 'pnpm';
    if (userAgent.startsWith('bun')) return 'bun';
  }
  return 'npm';
}

async function analyzePeerDependencies() {
  const packageManager = await getPackageManager();
  let issues = [];

  if (packageManager === 'yarn') {
    const output = execSync('yarn explain peer-requirements', { encoding: 'utf8' });
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes("doesn't provide") || line.includes("doesn't satisfy")) {
        issues.push(line.trim());
      }
    }
  } else {
    console.log("This script currently only supports Yarn projects.");
    process.exit(1);
  }

  return issues;
}

async function suggestFixes(issues) {
  const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
  const suggestions = new Map();

  for (const issue of issues) {
    const match = issue.match(/(\S+)@npm:(\S+) doesn't provide (\S+) to (\S+)@npm:(\S+)/);
    if (match) {
      const [, provider, providerVersion, missing, requester, requesterVersion] = match;
      if (!suggestions.has(missing)) {
        suggestions.set(missing, new Set());
      }
      suggestions.get(missing).add(`${requester}@${requesterVersion}`);
    }
  }

  console.log("\nSuggested actions:");
  for (const [missing, requesters] of suggestions) {
    console.log(`\n1. Install ${missing} as a dev dependency:`);
    console.log(`   yarn add ${missing} --dev`);
    console.log(`\n   This package is required by:`);
    for (const requester of requesters) {
      console.log(`   - ${requester}`);
    }
  }

  console.log("\n2. After installing the missing dependencies, run 'yarn install' to update the lockfile.");
  console.log("\n3. If issues persist, you may need to add resolutions to your package.json:");
  console.log("   ```json");
  console.log("   \"resolutions\": {");
  console.log("     \"<problematic-package>\": \"<version>\"");
  console.log("   }");
  console.log("   ```");
  console.log("   Replace <problematic-package> and <version> with appropriate values.");
}

async function main() {
  const issues = await analyzePeerDependencies();

  if (issues.length === 0) {
    console.log('No peer dependency issues detected.');
    return;
  }

  console.log('Detected peer dependency issues:');
  issues.forEach(issue => console.log(`- ${issue}`));

  await suggestFixes(issues);
}

main().catch(err => {
  console.error('An error occurred:', err);
  process.exit(1);
});