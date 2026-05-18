# nightshift-installer Specification

## Purpose
Defines the `nightshift` npm CLI, which in v4.x is a deprecation stub that directs users to the Claude Code plugin install path. All scaffolding, file writes, settings merges, agent generation, dependency checks, and idempotency concerns have been removed — those concerns now live in the plugin distribution and the `/nightshift:create` and `/nightshift:doctor` skills.

## Requirements
### Requirement: CLI entry point
The system SHALL provide a `nightshift` CLI binary installed globally via npm (`npm install -g @johndaskovsky/nightshift`) that exposes the `init` subcommand via the `commander` library.

#### Scenario: CLI is invocable after global install
- **WHEN** a user runs `npm install -g @johndaskovsky/nightshift`
- **THEN** the `nightshift` command SHALL be available on the system PATH and print usage help when invoked with `--help`

#### Scenario: Version flag
- **WHEN** a user runs `nightshift --version`
- **THEN** the CLI SHALL print the version from `package.json` and exit with code 0

#### Scenario: Unknown command
- **WHEN** a user runs `nightshift foo` where `foo` is not a registered subcommand
- **THEN** the CLI SHALL print an error message and display available commands

### Requirement: nightshift init is a deprecation stub
The `nightshift init` CLI command SHALL exist only as a deprecation message. When invoked, it SHALL print a notice that Nightshift is now distributed as a Claude Code plugin, give the user the two `/plugin` commands they need to install it, and exit with code 0. It SHALL perform no scaffolding, no file writes, no merges, and no dependency checks.

#### Scenario: Init prints deprecation and exits 0
- **WHEN** a user runs `nightshift init`
- **THEN** the command SHALL print a deprecation notice containing the string `nightshift init is deprecated`, the two `/plugin` commands (`/plugin marketplace add johndaskovsky/nightshift` and `/plugin install nightshift@nightshift`), and the project URL — and exit with code 0

#### Scenario: Init does not write files
- **WHEN** a user runs `nightshift init` in any directory
- **THEN** no `.claude/`, no `.nightshift/`, no `CLAUDE.md`, and no other files SHALL be created or modified anywhere on the filesystem

#### Scenario: Init does not check dependencies
- **WHEN** a user runs `nightshift init`
- **THEN** the command SHALL NOT execute `qsv`, `flock`, `jq`, or any other system command beyond what is needed to print the message

### Requirement: npm package structure
The system SHALL be distributed as an npm package with the correct structure for global CLI installation, and the same package SHALL include a Claude Code Plugin manifest so the package can also be installed via Claude Code's plugin discovery.

#### Scenario: Package includes required CLI files
- **WHEN** the package is published to npm
- **THEN** the published package SHALL include `bin/nightshift.js`, `dist/` (compiled JavaScript), and `templates/claude/` (bundled Markdown files for the Claude Code runtime)

#### Scenario: Package includes plugin manifest and bundled artifacts
- **WHEN** the package is published to npm
- **THEN** the published package SHALL include `.claude-plugin/plugin.json`, an `agents/` directory containing the Claude subagent files, and a `skills/` directory containing the Claude skill directories, all materialized from `templates/claude/`

#### Scenario: Package excludes development files
- **WHEN** the package is published to npm
- **THEN** the published package SHALL NOT include `src/` (TypeScript source), `node_modules/`, or test files

#### Scenario: Package excludes legacy OpenCode templates
- **WHEN** the package is published to npm
- **THEN** the published package SHALL NOT contain any `templates/opencode/` directory

#### Scenario: Bin entry is executable
- **WHEN** the package is installed globally
- **THEN** `bin/nightshift.js` SHALL have a `#!/usr/bin/env node` shebang and be marked executable

### Requirement: Build system
The system SHALL compile TypeScript source to JavaScript using a build step before publishing.

#### Scenario: Build produces dist output
- **WHEN** `pnpm run build` is executed
- **THEN** the system SHALL compile all TypeScript files from `src/` to `dist/` targeting ES2022 with NodeNext module resolution

#### Scenario: Build is required before publish
- **WHEN** `npm publish` is executed
- **THEN** the `prepublishOnly` script SHALL run the build step to ensure `dist/` is up to date
