# fix-peer-deps

A modern CLI tool to analyze and fix peer dependency issues across multiple package managers (npm, yarn, pnpm, bun).

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

## Output Example

```text
🔍 Fix Peer Dependencies Tool

📋 Found Issues:
• 2 critical issues
• 3 optional issues

🚨 Critical Issues:
react requires react-dom@^18.2.0
Current: missing

⚠️ Optional Issues:
typescript-eslint requires @types/node@*
Current: missing

📝 Suggested Actions:

Run the following command to fix critical issues:
yarn add react-dom@"^18.2.0"

Or run with --fix to automatically fix these issues:
fix-peer-deps --fix

Optional dependencies can be installed if needed:
These are typically development dependencies that may improve your development experience
```

## Changelog

### Version 1.1.0 (Latest)

- ✨ Added support for multiple package managers (npm, pnpm, Bun)
- 🎨 Enhanced terminal interface with colors and emojis
- 📊 Added progress bars and loading indicators
- 🔄 Updated dependencies:
  - execa: 9.5.1
  - ora: 8.1.1
  - Added chalk: 5.3.0
  - Added cli-progress: 3.12.0
- 🔍 Improved package manager detection
- 💡 Better suggestion formatting
- 🐛 Various bug fixes and improvements

### Version 1.0.12 (Deprecated)

- ⚠️ This version is deprecated. Please use version 1.1.0 or later
- Initial public release
- Basic Yarn support
- Peer dependency analysis
- Basic terminal output

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
