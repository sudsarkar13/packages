# fix-peer-deps

A modern CLI tool to analyze and fix peer dependency issues across multiple package managers (npm, yarn, pnpm, bun).

[![npm version](https://badge.fury.io/js/fix-peer-deps.svg)](https://badge.fury.io/js/fix-peer-deps)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Try on RunKit](https://badge.runkitcdn.com/fix-peer-deps.svg)](https://npm.runkit.com/fix-peer-deps)

## Description

`fix-peer-deps` is a powerful command-line tool designed to simplify the often complex task of managing peer dependencies in JavaScript/Node.js projects. It addresses common challenges developers face when working with packages that have peer dependency requirements:

- 🔍 **Intelligent Detection**: Automatically identifies peer dependency conflicts and missing requirements
- 🎯 **Smart Resolution**: Suggests the most compatible versions based on your project's constraints
- 🚀 **Universal Compatibility**: Works across major package managers (npm, yarn, pnpm, bun)
- 💡 **Developer-Friendly**: Provides clear, actionable suggestions with copy-paste ready commands
- 🎨 **Modern Interface**: Features a beautiful CLI interface with progress tracking and visual feedback

### Why Use fix-peer-deps?

1. **Save Time**: Quickly identify and resolve peer dependency issues that could take hours to debug manually
2. **Prevent Errors**: Catch peer dependency conflicts before they cause runtime issues
3. **Cross-Platform**: Works with any package manager, making it versatile for different project setups
4. **Clear Guidance**: Get straightforward solutions instead of cryptic error messages
5. **Modern Experience**: Enjoy a beautiful, interactive terminal interface while fixing dependencies

### How It Works

The tool performs a deep analysis of your project's dependency tree by:

1. Scanning your project's package manager and lock files
2. Analyzing direct and transitive dependencies
3. Identifying peer dependency conflicts and missing requirements
4. Generating specific, actionable solutions
5. Providing clear commands to resolve each issue

## Features

- 🎯 Accurately detects and categorizes peer dependency issues
- 🚦 Distinguishes between critical and optional peer dependencies
- 🔄 Supports modern package managers (npm, yarn 4.x, pnpm, bun)
- 🎨 Beautiful CLI interface with progress indicators
- 🧪 Intelligent filtering of development-only dependencies
- ⚡ Automatic fix mode with `--fix` option

## Try it Online

You can try fix-peer-deps directly in your browser using RunKit:

[![Try fix-peer-deps on RunKit](https://badge.runkitcdn.com/fix-peer-deps.svg)](https://npm.runkit.com/fix-peer-deps)

```javascript
// Interactive demo of fix-peer-deps features
const { analyzePeerDependencies, detectPackageManager, autoFix, checkDeepPeerDependencies } = require('fix-peer-deps');

// Sample project with various dependency scenarios
const project = {
  dependencies: {
    "react": "17.0.2",
    "react-dom": "18.2.0",
    "@mui/material": "5.15.5",
    "@mui/lab": "5.0.0-alpha.161"
  }
};

// Sample dependency info for deep checking
const depInfo = {
  "@mui/lab": {
    version: "5.0.0-alpha.161",
    peerDependencies: {
      "@mui/material": "^5.0.0",
      "react": "^17.0.0 || ^18.0.0"
    }
  }
};

// Demonstrate key features
async function demonstrateFeatures() {
  try {
    // 1. Detect Package Manager
    const packageManager = await detectPackageManager();
    console.log('📦 Package Manager:', packageManager);

    // 2. Analyze Dependencies
    const issues = await analyzePeerDependencies();
    console.log('\n🔍 Analysis Results:');
    console.log('• Critical Issues:', issues.critical.length);
    console.log('• Optional Issues:', issues.optional.length);

    // 3. Check Deep Dependencies
    const visited = new Set();
    const deepIssues = await checkDeepPeerDependencies(
      '@mui/lab',
      depInfo['@mui/lab'],
      depInfo,
      visited
    );
    console.log('\n🌳 Deep Dependencies:');
    deepIssues.forEach(issue => 
      console.log(`• ${issue.package} → ${issue.dependency}`)
    );

    // 4. Get Auto-Fix Commands
    const fixCommands = await autoFix();
    console.log('\n🛠️  Suggested Fixes:');
    fixCommands.forEach(cmd => console.log('•', cmd));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

demonstrateFeatures();
```

The example above demonstrates:

- Package manager detection (npm, yarn, pnpm, bun)
- Dependency analysis with version conflict detection
- Deep peer dependency checking
- Missing peer dependency identification
- Optional dependency suggestions
- Auto-fix command generation
- Error handling and formatted output

Try it yourself by clicking the RunKit badge above!

## Installation

### Method 1: Run Directly (Recommended for one-time use)

```bash
# Using npm
npx fix-peer-deps

# Using yarn
yarn dlx fix-peer-deps

# Using pnpm
pnpm dlx fix-peer-deps

# Using bun
bunx fix-peer-deps
```

### Method 2: Global Installation

If you frequently work with multiple Node.js projects, you can install the package globally:

```bash
# Using npm
npm install -g fix-peer-deps

# Using yarn
yarn global add fix-peer-deps

# Using pnpm
pnpm add -g fix-peer-deps

# Using bun
bun add -g fix-peer-deps
```

After global installation:

1. Verify the installation:

   ```bash
   fix-peer-deps --version
   ```

2. You can now run the tool from any directory:

   ```bash
   cd /path/to/your/project
   fix-peer-deps
   ```

## Usage

### Basic Usage

1. Navigate to your project directory:

   ```bash
   cd /path/to/your/project
   ```

2. Run the analysis:

   ```bash
   fix-peer-deps
   ```

3. Review the output:
   - Critical issues that need attention
   - Optional dependencies that might improve development
   - Suggested commands to fix issues

4. Fix issues either:
   - Manually using the suggested commands, or
   - Automatically using the `--fix` option

### Command Options

```bash
# Analyze and get suggestions
fix-peer-deps

# Automatically fix issues
fix-peer-deps --fix

# Show help information
fix-peer-deps --help

# Check version
fix-peer-deps -v
# or
fix-peer-deps --version
```

### Available Commands

- `fix-peer-deps`: Analyzes your project and provides suggestions
- `fix-peer-deps --fix`: Automatically installs missing peer dependencies
- `fix-peer-deps -h, --help`: Shows help information
- `fix-peer-deps -v, --version`: Shows the current version

The tool will:

1. Detect your package manager
2. Analyze your dependencies
3. Categorize issues by severity
4. Provide specific commands to fix critical issues
5. List optional dependencies that might improve your development experience

## Understanding the Output

The tool categorizes peer dependency issues into two types:

### Critical Issues (🚨)

- Missing or incompatible dependencies that are required for packages to function
- These should typically be resolved to ensure proper functionality
- Can be automatically fixed using the `--fix` option

### Optional Issues (⚠️)

- Development dependencies that might enhance your development experience
- Type definitions (@types/*)
- Optional peer dependencies
- Development tool integrations

## Example Output

When you run `fix-peer-deps`, you'll see output similar to this:

```bash
🔍 Detecting package manager... npm

📦 Analyzing dependencies...
████████████████████████████████████ 100%

📋 Found Issues:
• 2 critical issues
• 1 optional issue

🚨 Critical Issues:

react-dom requires react@^18.2.0
Current: 17.0.2

@mui/material requires react@^17.0.0 || ^18.0.0
Current: missing

⚠️  Optional Issues:

@types/react optionally requires react@*
Current: 17.0.2

📝 Suggested Actions:
Run the following commands to resolve critical issues:

npm install react@18.2.0
npm install @mui/material

💡 Tips:
• Use --fix to automatically resolve critical issues
• Optional issues can be resolved manually if needed
```

This output shows:

- Package manager detection
- Progress of dependency analysis
- Summary of found issues
- Detailed breakdown of critical and optional issues
- Specific commands to resolve problems
- Helpful tips for using the tool

## Common Use Cases

1. **Starting a New Project**:

   ```bash
   cd my-new-project
   npm init -y
   npm install some-package
   fix-peer-deps  # Check for any peer dependencies
   ```

2. **Fixing Dependency Issues**:

   ```bash
   fix-peer-deps --fix  # Automatically install missing dependencies
   ```

3. **Auditing Dependencies**:

   ```bash
   fix-peer-deps  # Review all peer dependency relationships
   ```

4. **CI/CD Integration**:

   ```bash
   # In your CI script
   fix-peer-deps || exit 1  # Exit with error if critical issues found
   ```

## Configuration

The tool automatically detects your package manager based on:

1. The `packageManager` field in package.json
2. Lock files present in your project
3. Defaults to npm if no specific manager is detected

## Supported Package Managers

- npm (all versions)
- yarn (including yarn 4.x)
- pnpm
- bun

## Troubleshooting

### Common Issues

1. **Command Not Found**

   ```bash
   # Reinstall globally
   npm install -g fix-peer-deps
   ```

2. **Permission Errors**

   ```bash
   # Use sudo for global installation if needed
   sudo npm install -g fix-peer-deps
   ```

3. **Package Manager Detection Issues**

   ```bash
   # Ensure you're in a directory with package.json
   ls package.json
   ```

### Error Messages

- "No package.json found": Navigate to your project root directory
- "Failed to fix dependencies": Check your network connection and try again
- "Analysis failed": Ensure your package manager is properly installed

## Future Scope

### AI Integration

- 🤖 Local AI-powered dependency analysis using Ollama
- 📊 Smart version recommendations based on project context
- 🔍 Intelligent compatibility checking
- 🛡️ Automated security considerations
- 💡 Personalized upgrade path suggestions

These enhancements will help:

- Automate decision-making for version conflicts
- Predict potential compatibility issues
- Provide context-aware security recommendations
- Optimize dependency trees automatically

## Requirements

- Node.js 14.x or higher
- One of the supported package managers installed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Sudeepta Sarkar](https://github.com/sudsarkar13)

## Author

Sudeepta Sarkar <sudsarkar13@gmail.com>

## Issues

If you encounter any problems or have suggestions for improvements, please file an issue at:
<https://github.com/sudsarkar13/packages/issues>
