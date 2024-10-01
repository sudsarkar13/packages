# fix-peer-deps

A tool to analyze and suggest fixes for peer dependency issues in Yarn 4.x.x projects.

## Description

`fix-peer-deps` is a command-line tool that helps identify and provide suggestions for resolving peer dependency issues in Yarn 4.x.x projects. It analyzes your project's dependencies and offers recommendations for fixing conflicts.

## Installation

This package is designed to be used with `yarn dlx`, so there's no need for a global installation.

## Usage

In your Yarn 4.x.x project directory, run:

```bash
yarn dlx fix-peer-deps
```

This command will analyze your project's peer dependencies and provide suggestions for resolving any issues.

## Features

- Detects peer dependency issues in Yarn 4.x.x projects
- Provides detailed information about conflicts
- Suggests actions to resolve issues, including:
  - Installing missing dependencies
  - Updating the lockfile
  - Adding resolutions to package.json if needed

## Requirements

- Yarn 4.x.x

## Limitations

- Currently only supports Yarn 4.x.x projects
- Does not automatically fix issues, but provides suggestions for manual resolution

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Sudeepta Sarkar <sudsarkar13@gmail.com>

## Issues

If you encounter any problems or have suggestions for improvements, please file an issue at:
<https://github.com/sudsarkar13/starter-apps/issues>
