# Contributing to Import Map Devtools

Thank you for your interest in contributing to Import Map Devtools! This document provides guidelines and explains the workflow for contributions.

## Development Setup

1. Fork the repository
2. Clone your fork locally
3. Install dependencies with `npm install`
4. Start the development environment with `npm run dev`

## Pull Request Process

1. Create a branch for your feature or bugfix
2. Make your changes
3. Add tests if applicable
4. Update documentation if needed
5. Submit a pull request to the `main` branch

## Automatic Versioning with PR Labels

We use PR labels to automatically trigger version bumps and releases. When submitting a PR that should result in a new version being published, add one of the following labels:

- `version:patch` - For backwards-compatible bug fixes

  - Examples: Bug fixes, small changes, documentation updates
  - Version change: 1.0.0 → 1.0.1

- `version:minor` - For new backwards-compatible functionality

  - Examples: New features, substantial changes that don't break existing functionality
  - Version change: 1.0.0 → 1.1.0

- `version:major` - For breaking changes
  - Examples: API changes, removing deprecated functionality
  - Version change: 1.0.0 → 2.0.0

When a PR with one of these labels is merged to `main`, our GitHub Actions workflow will:

1. Bump the version in package.json based on the label
2. Create a Git tag and GitHub Release
3. Publish the package to GitHub Packages

### Direct Commits to Main

Any direct commits pushed to the main branch will also automatically trigger a patch version bump and release to GitHub Packages. This is useful for quick fixes or changes that don't warrant a full PR process.

Note: The commit message must not contain "chore: bump version" to avoid triggering an infinite loop of version bumps.

## Commit Message Format

We recommend using conventional commits format for clarity:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests
- `chore:` Changes to the build process or auxiliary tools

Example: `fix: correct import map overlay positioning in Firefox`

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We expect all contributors to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Questions?

If you have any questions about contributing, please open an issue for discussion.
