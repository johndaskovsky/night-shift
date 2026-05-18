# claude-code-target Specification

## Purpose
Defines the Claude Code installation surface for Nightshift. Nightshift is distributed exclusively as a Claude Code plugin via its own marketplace; the npm package remains published only as a deprecation artifact pointing users at the plugin install path.

## Requirements
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

### Requirement: Claude subagent files
The plugin SHALL ship ONE Claude Code subagent file (`manager.md`) at `plugins/nightshift/agents/`. The file SHALL use Claude Code subagent frontmatter format (`name`, `description`, `tools`, `model`; optional `mcpServers`, `hooks`, `skills`, `disallowedTools`, `permissionMode`, `memory`, `isolation`, `color`). The dev role SHALL NOT have a subagent file — dev work runs as a top-level `claude -p` subprocess.

#### Scenario: Manager subagent omits Agent tool
- **WHEN** `plugins/nightshift/agents/manager.md` is parsed
- **THEN** its `tools` frontmatter field SHALL NOT include `Agent` (no subagent delegation); SHALL include `Read`, `Write`, `Edit`, `Bash`, `Glob`, and `Grep` to support orchestration and subprocess dispatch

#### Scenario: Manager subagent declares Bash claude permission
- **WHEN** `plugins/nightshift/agents/manager.md` is parsed
- **THEN** its `allowed-tools` frontmatter SHALL include `Bash(claude *)` so the manager can spawn `claude -p` subprocesses without permission prompts

#### Scenario: No nightshift-dev subagent file is written
- **WHEN** the plugin is inspected
- **THEN** `plugins/nightshift/agents/nightshift-dev.md` SHALL NOT be present

### Requirement: Nightshift skills as Claude Code Skills
The plugin SHALL provide eight skill directories under `plugins/nightshift/skills/` corresponding to the seven user-facing Nightshift commands plus the internal `do-task` skill: `create`, `add-task`, `update-table`, `start`, `test-task`, `archive`, `doctor`, and `do-task`. Each skill directory SHALL contain a `SKILL.md` entrypoint and MAY contain a `scripts/` subdirectory of supporting executables.

#### Scenario: Each skill has a SKILL.md
- **WHEN** the plugin is inspected
- **THEN** every skill directory under `plugins/nightshift/skills/*/` SHALL contain a file named exactly `SKILL.md` with valid YAML frontmatter delimited by `---`

#### Scenario: Skills disable model invocation
- **WHEN** any Nightshift `SKILL.md` is parsed
- **THEN** its frontmatter SHALL include `disable-model-invocation: true` to prevent Claude from auto-invoking side-effecting workflows

#### Scenario: Skills pre-approve CSV operations
- **WHEN** a Nightshift `SKILL.md` is parsed
- **THEN** its frontmatter `allowed-tools` field SHALL include `Bash(qsv *)` and `Bash(flock *)` (for skills that perform CSV operations) so those operations execute without per-call permission prompts while the skill is active

#### Scenario: Start skill uses forked manager subagent
- **WHEN** `plugins/nightshift/skills/start/SKILL.md` is parsed
- **THEN** its frontmatter SHALL include `context: fork` and `agent: manager` so the skill body becomes the manager subagent's task prompt directly

#### Scenario: Do-task skill is top-level
- **WHEN** `plugins/nightshift/skills/do-task/SKILL.md` is parsed
- **THEN** its frontmatter SHALL NOT include `context: fork` — the skill runs in the calling top-level session (which, for manager-spawned subprocesses, is the fresh `claude -p` session that inherits user MCPs)

#### Scenario: Skills use shift name argument
- **WHEN** any Nightshift `SKILL.md` body references the shift name
- **THEN** it SHALL use `$ARGUMENTS` or `$0` substitution so the user can invoke `/nightshift:<verb> <shift-name>` (or, for `do-task`, `/nightshift:do-task <shift> <task> <id>`) and have arguments resolve correctly

### Requirement: Bundled scripts use portable paths
The system SHALL reference bundled skill scripts via the `${CLAUDE_SKILL_DIR}` environment variable so that scripts resolve correctly regardless of whether the skill is installed at user, project, or plugin scope. This SHALL include `dispatch-batch.sh` (the parallel dispatch helper) installed under `plugins/nightshift/skills/start/scripts/`.

#### Scenario: Script invocation uses CLAUDE_SKILL_DIR
- **WHEN** a `SKILL.md` invokes a bundled script
- **THEN** the invocation SHALL use the form `${CLAUDE_SKILL_DIR}/scripts/<name>.sh` rather than a relative or absolute path

#### Scenario: Scripts are executable
- **WHEN** a script is bundled under `<skill>/scripts/`
- **THEN** it SHALL be marked executable (mode `0755`)

#### Scenario: Dispatch helper is portable
- **WHEN** the manager invokes the parallel dispatch helper
- **THEN** it SHALL use `${CLAUDE_SKILL_DIR}/scripts/dispatch-batch.sh` so the call resolves identically across plugin scopes

### Requirement: Dynamic context injection for live state
The system MAY use Claude Code's `` !`<command>` `` dynamic context injection syntax in skill bodies to inline live shift state (item counts, status summaries) into the prompt before Claude reads it. When used, the injected commands SHALL use `flock -x` exclusive locks to coordinate with concurrent dev agents.

#### Scenario: Pre-flight summary inlines counts
- **WHEN** the user invokes `/nightshift:start <shift-name>`
- **THEN** the rendered skill body SHALL contain pre-computed totals (total items, done count, failed count, todo count) inlined via `` !`flock -x ... qsv ...` `` blocks before the manager subagent receives the prompt

### Requirement: Manager subagent fits Claude Code re-attach budget
The system SHALL ensure the manager subagent system prompt (frontmatter excluded) is small enough to fit within Claude Code's per-skill auto-compaction re-attach budget of 5,000 tokens.

#### Scenario: Manager prompt under budget
- **WHEN** the plugin `plugins/nightshift/agents/manager.md` is inspected
- **THEN** the prose body SHALL be under 5,000 tokens (verified by a build-time or test-time character/token check) so that the manager's instructions survive auto-compaction during long shifts
