## ADDED Requirements

### Requirement: Marketplace catalog at repo root
The repository SHALL contain a Claude Code marketplace catalog at `.claude-plugin/marketplace.json` declaring a single plugin named `nightshift`. The marketplace SHALL be named `nightshift` so that `/plugin install` reads as `/plugin install nightshift@nightshift`.

#### Scenario: Marketplace catalog exists and validates
- **WHEN** the repository is inspected
- **THEN** `.claude-plugin/marketplace.json` SHALL exist, contain `"name": "nightshift"`, owner information, and a `plugins` array with exactly one entry whose `name` is `nightshift` and whose `source` resolves to `./plugins/nightshift`

#### Scenario: Plugin install command works from this marketplace
- **WHEN** a user runs `/plugin marketplace add johndaskovsky/nightshift` followed by `/plugin install nightshift@nightshift`
- **THEN** the install SHALL succeed and the plugin's skills SHALL appear as `/nightshift:<skill-name>` in Claude Code

### Requirement: Plugin manifest under plugins/nightshift
The repository SHALL contain a plugin manifest at `plugins/nightshift/.claude-plugin/plugin.json` declaring the plugin's identity, version, and metadata.

#### Scenario: Plugin manifest is present and valid
- **WHEN** the repository is inspected
- **THEN** `plugins/nightshift/.claude-plugin/plugin.json` SHALL exist and contain `name`, `version`, and `description` fields

#### Scenario: Plugin manifest version matches package.json
- **WHEN** the repository's build runs
- **THEN** the version in `plugins/nightshift/.claude-plugin/plugin.json` SHALL match the version in the root `package.json`

### Requirement: Canonical plugin layout
The plugin SHALL be authored directly under `plugins/nightshift/` with no build-step copy from any other location. Skills SHALL live at `plugins/nightshift/skills/<name>/SKILL.md`. Agents SHALL live at `plugins/nightshift/agents/<name>.md`. Bundled scripts SHALL live at `plugins/nightshift/skills/<name>/scripts/`.

#### Scenario: Plugin files live in canonical location
- **WHEN** the repository is inspected
- **THEN** the skill files SHALL exist at `plugins/nightshift/skills/{start,create,add-task,update-table,do-task,test-task,archive,doctor}/SKILL.md`

#### Scenario: No legacy templates directory
- **WHEN** the repository is inspected
- **THEN** the `templates/` directory SHALL NOT exist

#### Scenario: No legacy materialized output at repo root
- **WHEN** the repository is inspected
- **THEN** there SHALL NOT be `agents/` or `skills/` directories at the repository root (the plugin's content is exclusively under `plugins/nightshift/`)

### Requirement: Plugin loads via --plugin-dir
The plugin SHALL be loadable with `claude --plugin-dir ./plugins/nightshift` and all its skills SHALL be invocable in the resulting session.

#### Scenario: Local plugin load
- **WHEN** a developer runs `claude --plugin-dir ./plugins/nightshift` from the repo root
- **THEN** Claude Code SHALL start without plugin load errors and `/help` SHALL list the namespaced skills under `/nightshift:`
