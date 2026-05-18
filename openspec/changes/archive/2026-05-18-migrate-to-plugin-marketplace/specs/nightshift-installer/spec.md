## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Init command scaffolds directories
**Reason**: The CLI no longer scaffolds anything. Project-level directory creation moves to `/nightshift:create` (via init-shift.sh); runtime-layer directory creation is handled by Claude Code's plugin install.

**Migration**: Users upgrading to v4.x will see a deprecation notice when running `nightshift init` and should switch to `/plugin marketplace add johndaskovsky/nightshift` and `/plugin install nightshift@nightshift`.

### Requirement: Init command generates agent files
**Reason**: Plugin install (Claude Code's `/plugin install`) handles agent file placement automatically. The plugin's agents directory is `plugins/nightshift/agents/`.

**Migration**: No user action required beyond `/plugin install nightshift@nightshift`.

### Requirement: Init command summary output
**Reason**: No scaffolding happens, so there is nothing to summarize. The deprecation message is the sole output.

**Migration**: None.

### Requirement: Init command is idempotent
**Reason**: No file writes, no idempotency concern.

**Migration**: None.

### Requirement: First-run detection
**Reason**: No scaffolding distinction between first-run and re-run.

**Migration**: None.

### Requirement: Init writes CLAUDE.md
**Reason**: Already removed in the prior `drop-claude-md-merge` change. Confirmed here as part of the broader CLI decommissioning.

**Migration**: Existing `<!-- nightshift:start --> ... <!-- nightshift:end -->` blocks in user CLAUDE.md files are left untouched.

### Requirement: Init removes stale nightshift-dev subagent
**Reason**: 3.x users already migrated past this. The 4.x CLI does nothing, so it cannot perform legacy cleanup.

**Migration**: Users still running 2.x and upgrading directly to 4.x can delete `.claude/agents/nightshift-dev.md` manually if it exists.

### Requirement: Template bundling
**Reason**: The `templates/` directory is deleted. Plugin files are authored directly under `plugins/nightshift/`. There is no template-to-target copy step.

**Migration**: None for users. Contributors edit `plugins/nightshift/skills/<name>/SKILL.md` directly.

### Requirement: Init writes Claude settings
**Reason**: `permissions.allow` entries are no longer merged into `~/.claude/settings.json`. Each SKILL.md and the manager agent declare their tool needs via `allowed-tools` frontmatter. If Claude Code does not auto-grant these, users add them manually once.

**Migration**: If a user sees repeated permission prompts on `Bash(qsv *)`, `Bash(flock *)`, or `Bash(claude *)`, they can add those entries to `~/.claude/settings.json` themselves. The README documents this fallback.

### Requirement: Non-interactive mode
**Reason**: No interactive behavior to remove or preserve — the CLI just prints a message and exits.

**Migration**: None.

### Requirement: Init command preserves existing shift data
**Reason**: No-op CLI cannot harm shift data by definition.

**Migration**: None.
