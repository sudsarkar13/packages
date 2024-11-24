# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2024-02-14

### Added

- Enhanced tree-style visualization of dependencies
- Improved color coding and icons for different issue types
- Added summary section showing counts of critical issues, warnings, and optional issues
- Enhanced suggested actions with clearer formatting

### Changed

- Improved version compatibility detection using `semver`
- Better organization of issues into categories: errors, warnings, and optional dependencies
- Updated documentation with more examples and clearer instructions

### Fixed

- Fixed version inconsistency between package.json and index.js
- Improved error handling for npm's output
- Better handling of optional peer dependencies

## [1.1.0] - 2024-02-13

### Added

- Support for multiple package managers (npm, yarn, pnpm, bun)
- Deep dependency checking for nested peer dependencies
- Progress bar for dependency analysis
- Color-coded output for better readability

### Changed

- Improved dependency tree analysis
- Better error messages and suggestions
- Updated documentation

## [1.0.0] - 2024-02-12

### Added

- Initial release
- Basic peer dependency analysis
- Support for npm package manager
- Simple command-line interface
