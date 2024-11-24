# fix-peer-deps

🔍 A modern CLI tool to analyze and fix peer dependency issues across multiple package managers.

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

✨ **Key Features**:

- Multi-package manager support (Yarn, npm, pnpm, Bun)
- Beautiful terminal interface with colors and progress indicators
- Smart package manager detection
- Detailed analysis and suggestions
- Interactive progress tracking
- Clear, emoji-enhanced output

## Installation

This package is designed to be used with package manager executors, so there's no need for a global installation:

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

## Usage

The tool can be run in different modes:

```bash
# Analyze and get suggestions
npx fix-peer-deps

# Automatically fix issues
npx fix-peer-deps --fix

# Show help information
npx fix-peer-deps --help

# Check version
npx fix-peer-deps -v
# or
npx fix-peer-deps --version
```

### Available Commands

- `npx fix-peer-deps`: Analyzes your project and provides suggestions for fixing peer dependency issues
- `npx fix-peer-deps --fix`: Automatically installs missing peer dependencies and updates your project
- `npx fix-peer-deps -h, --help`: Shows help information and available commands
- `npx fix-peer-deps -v, --version`: Shows the current version of the tool

The tool will:

1. 🔍 Automatically detect your package manager
2. 📊 Analyze your dependencies
3. 🚨 Identify peer dependency issues
4. 💡 Provide clear, actionable suggestions
5. 🔧 Automatically fix issues (when using --fix)

## Supported Package Managers

- Yarn (v4.x.x)
- npm
- pnpm
- Bun

## Output Example

```text
🔍 Fix Peer Dependencies Tool

ℹ️  Detected package manager: yarn

📋 Analysis Results
✅ Found 2 peer dependency issues

Analyzing Issues |██████████| 100% || 2/2 Issues

🔧 Suggested Fixes
ℹ️  Missing Dependency: react
Required by:
  • @emotion/react@11.0.0
  • @mui/material@5.0.0

To fix, run:
  yarn add react --dev

📝 Additional Steps
ℹ️  1. After installing dependencies, run: yarn install
ℹ️  2. If issues persist, add resolutions to package.json
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

### Version 1.0.12

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

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Sudeepta Sarkar <sudsarkar13@gmail.com>

## Issues

If you encounter any problems or have suggestions for improvements, please file an issue at:
<https://github.com/sudsarkar13/starter-apps/issues>
