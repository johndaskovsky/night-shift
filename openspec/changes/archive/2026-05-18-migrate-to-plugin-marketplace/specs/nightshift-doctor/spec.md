## ADDED Requirements

### Requirement: Doctor skill verifies system dependencies
The plugin SHALL ship a `/nightshift:doctor` skill that verifies the presence of system dependencies required by Nightshift (`qsv`, `flock`, `jq`) and prints actionable install hints for any missing ones. The skill SHALL be invoked manually by the user; it is not auto-invoked by Claude.

#### Scenario: All dependencies present
- **WHEN** a user runs `/nightshift:doctor` and `qsv`, `flock`, and `jq` are all on PATH
- **THEN** the skill SHALL report all three as present (e.g., `✓ qsv`, `✓ flock`, `✓ jq`) and indicate that Nightshift is ready to use

#### Scenario: One or more dependencies missing
- **WHEN** a user runs `/nightshift:doctor` and at least one of `qsv`, `flock`, `jq` is not on PATH
- **THEN** the skill SHALL report each missing dependency with a `brew install <name>` hint and a link to its homepage where applicable

#### Scenario: Doctor is opt-in
- **WHEN** Claude Code is processing a user request unrelated to Nightshift setup
- **THEN** Claude SHALL NOT auto-invoke `/nightshift:doctor` (the skill SHALL have `disable-model-invocation: true`)

### Requirement: Doctor replaces install-time dependency check
The `/nightshift:doctor` skill SHALL serve as the replacement for the install-time dependency check that the deprecated `nightshift init` CLI performed. The plugin install itself SHALL NOT perform any dependency check.

#### Scenario: Plugin install does not check dependencies
- **WHEN** a user runs `/plugin install nightshift@nightshift`
- **THEN** Claude Code SHALL NOT execute any check for `qsv`, `flock`, or `jq` as part of installation (this is delegated to `/nightshift:doctor`)
