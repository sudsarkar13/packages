# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.7] - 2024-12-08

### Added

- Better version compatibility checking using semver
- Improved detection of peer dependency conflicts
- Automatic installation of dependencies when node_modules is missing

### Changed

- Enhanced package manager detection logic
- Improved error handling and reporting
- Better progress indication during analysis
- Separated missing dependencies from version conflicts

### Fixed

- Fixed ESM module compatibility issues
- Improved handling of missing node_modules directory
- Better error messages for installation failures

## [1.1.6] - 2024-12-07

### Added

- Enhanced package manager detection with verification
- Added support for multiple package manager installations
- Added installation verification step for dependencies

### Changed

- Improved error handling and recovery for failed installations
- Enhanced package manager-specific command handling
- Added proper peer dependency flags for npm (--save-peer) and pnpm (-P)
- Better progress indication and detailed logging
- Improved handling of partial installation failures

### Fixed

- Fixed package manager detection when multiple lock files exist
- Fixed auto-fix functionality across npm, yarn, pnpm, and bun
- Fixed dependency verification after installation

## [1.1.5] - 2024-11-25

### Changed

- Updated RunKit example to use CommonJS require instead of ES imports
- Improved RunKit compatibility
- Fixed documentation for better RunKit integration

## [1.1.4] - 2024-11-25

### Changed

- Updated repository URLs to reflect new organization structure
- Improved documentation formatting
- Fixed version synchronization across files

## [1.1.3] - 2024-11-24 [DEPRECATED]

### Added

- Enhanced example.js with comprehensive feature demonstrations
- Added deep peer dependency checking to examples
- Improved RunKit integration

### Changed

- Better documentation with clear feature explanations
- Improved error handling in examples
- Enhanced output formatting

### Deprecated

- This version has been deprecated due to repository migration and improvements
- Repository URL updated from starter-apps to packages

## [1.1.2] - 2024-11-24 [DEPRECATED]

### Added

- Added CONTRIBUTING.md with detailed contribution guidelines
- Added CHANGELOG.md for better version tracking
- Added more keywords for better npm discoverability

### Changed

- Improved documentation organization
- Enhanced package.json configuration for npm publication
- Updated file permissions for CLI execution

### Deprecated

- This version has been deprecated due to repository migration and improvements
- Repository URL updated from starter-apps to packages

## [1.1.1] - 2024-11-24 [DEPRECATED]

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

### Deprecated

- This version has been deprecated due to repository migration and improvements
- Repository URL updated from starter-apps to packages

## [1.1.0] - 2024-11-24 [DEPRECATED]

### Added

- Support for multiple package managers (npm, yarn, pnpm, bun)
- Deep dependency checking for nested peer dependencies
- Progress bar for dependency analysis
- Color-coded output for better readability

### Changed

- Improved dependency tree analysis
- Better error messages and suggestions
- Updated documentation

### Deprecated

- This version has been deprecated due to repository migration and improvements
- Repository URL updated from starter-apps to packages

## [1.0.0] - 2024-09-12 [DEPRECATED]

### Added

- Initial release
- Basic peer dependency analysis
- Support for npm package manager
- Simple command-line interface

### Deprecated

- This version has been deprecated due to repository migration and improvements
- Repository URL updated from starter-apps to packages
