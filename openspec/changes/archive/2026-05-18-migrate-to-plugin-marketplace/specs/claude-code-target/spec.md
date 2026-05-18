## MODIFIED Requirements

### Requirement: Distribution channel
Nightshift SHALL be distributed exclusively as a Claude Code plugin via its own marketplace. The npm package `@johndaskovsky/nightshift` SHALL remain published as a deprecation artifact only — its CLI does no scaffolding work, it merely points users at the plugin install path.

#### Scenario: Primary install path is plugin marketplace
- **WHEN** the README's installation section is followed
- **THEN** the documented path SHALL be `/plugin marketplace add johndaskovsky/nightshift` followed by `/plugin install nightshift@nightshift`

#### Scenario: npm package directs to plugin
- **WHEN** a user installs the npm package and runs `nightshift init`
- **THEN** the CLI SHALL print the deprecation notice with the `/plugin` install instructions

### Requirement: Plugin manifest at canonical location
The plugin manifest SHALL live at `plugins/nightshift/.claude-plugin/plugin.json` and SHALL be the authoritative source for the plugin's name, version, and metadata. The build SHALL synchronize the plugin manifest's `version` field with the root `package.json` version.

#### Scenario: Plugin manifest version matches package version
- **WHEN** `pnpm build` runs
- **THEN** `plugins/nightshift/.claude-plugin/plugin.json` SHALL have a `version` field equal to `package.json`'s `version`

## REMOVED Requirements

### Requirement: CLI is the primary install path
**Reason**: The npm CLI is now a deprecation artifact. Plugin marketplace is the primary path.

**Migration**: Users on v3.x running `npm install -g @johndaskovsky/nightshift && nightshift init` should switch to `/plugin marketplace add johndaskovsky/nightshift && /plugin install nightshift@nightshift`.

### Requirement: Dual distribution
**Reason**: Dual distribution (CLI + plugin) is collapsed to plugin-only. The conflict between the two paths no longer exists because only one path actively works.

**Migration**: Users with both installed should remove the per-project `.claude/skills/nightshift-*/` directories from their projects. Stale copies will shadow the plugin via Claude Code's precedence rules.
