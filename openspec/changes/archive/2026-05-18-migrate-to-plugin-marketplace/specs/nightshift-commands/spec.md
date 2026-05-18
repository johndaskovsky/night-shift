## MODIFIED Requirements

### Requirement: Command files are plugin-distributed
The system SHALL distribute Nightshift's user-facing skills as part of the Claude Code plugin at `plugins/nightshift/skills/`. Skill folder names SHALL drop the legacy `nightshift-` prefix because plugin skills are always namespaced by the plugin name. Users invoke them as `/nightshift:<skill-name>` (e.g., `/nightshift:start`).

#### Scenario: Skills are available after plugin install
- **WHEN** a user runs `/plugin install nightshift@nightshift` and then `/help` (or types `/`) in Claude Code
- **THEN** all user-facing Nightshift skills SHALL be available under the `/nightshift:` namespace: `/nightshift:create`, `/nightshift:start`, `/nightshift:archive`, `/nightshift:add-task`, `/nightshift:test-task`, `/nightshift:update-table`, `/nightshift:doctor`

#### Scenario: Skill folder names use unprefixed kebab-case
- **WHEN** the plugin source is inspected
- **THEN** skill folders under `plugins/nightshift/skills/` SHALL be named `start/`, `create/`, `add-task/`, `update-table/`, `do-task/`, `test-task/`, `archive/`, and `doctor/` (no `nightshift-` prefix)

### Requirement: Create shift command
The system SHALL provide a `/nightshift:create` skill that scaffolds a new shift with a manager file, an empty table, and optionally one or more initial task files. The skill SHALL also perform idempotent project-level bootstrap on every invocation: create `.nightshift/` and `.nightshift/archive/` if missing, and create `.nightshift/.gitignore` with default ignore patterns if missing.

#### Scenario: Create shift with name only
- **WHEN** user runs `/nightshift:create my-batch-job`
- **THEN** the system SHALL ensure `.nightshift/archive/` exists, ensure `.nightshift/.gitignore` exists (creating with default patterns if absent), and create `.nightshift/my-batch-job/` containing `manager.md` with default template and an empty `table.csv` with no columns

#### Scenario: Create shift interactively
- **WHEN** user runs `/nightshift:create` without a name
- **THEN** the system SHALL prompt the user to describe what the shift will do and derive a kebab-case name from their description

#### Scenario: Shift name already exists
- **WHEN** user runs `/nightshift:create my-batch-job` and `.nightshift/my-batch-job/` already exists
- **THEN** the system SHALL report that the shift already exists and suggest using `/nightshift:start` to resume it

#### Scenario: Bootstrap is idempotent across multiple shifts
- **WHEN** a user runs `/nightshift:create first-shift` followed by `/nightshift:create second-shift`
- **THEN** the second invocation SHALL NOT overwrite or modify `.nightshift/archive/` or `.nightshift/.gitignore` (they are created only when missing)

#### Scenario: Bootstrap on a fresh project
- **WHEN** user runs `/nightshift:create my-first-shift` in a directory that has no `.nightshift/` directory at all
- **THEN** the system SHALL create `.nightshift/archive/` and `.nightshift/.gitignore` before creating the shift directory, producing a complete project-layer setup in a single skill invocation

### Requirement: Start shift command
The system SHALL provide a `/nightshift:start` skill that begins or resumes execution of a shift by invoking the manager agent. The skill SHALL invoke the manager once and read its completion output for the final report.

#### Scenario: Start a new shift
- **WHEN** user runs `/nightshift:start my-batch-job` and all table statuses are `todo`
- **THEN** the system SHALL invoke the manager agent (defined at `plugins/nightshift/agents/manager.md`) to begin processing all remaining items autonomously

#### Scenario: Resume an interrupted shift
- **WHEN** user runs `/nightshift:start my-batch-job` and the table contains a mix of `done`, `todo`, and `failed` statuses
- **THEN** the system SHALL invoke the manager agent, which SHALL skip `done` items and process remaining `todo` items autonomously

#### Scenario: All items complete
- **WHEN** user runs `/nightshift:start my-batch-job` and all item-task statuses are `done`
- **THEN** the system SHALL report that the shift is complete and suggest archiving with `/nightshift:archive`

### Requirement: Archive shift command
The system SHALL provide a `/nightshift:archive` skill that moves a completed shift to the archive directory with a date prefix.

#### Scenario: Archive a shift
- **WHEN** user runs `/nightshift:archive my-batch-job`
- **THEN** the system SHALL move `.nightshift/my-batch-job/` to `.nightshift/archive/YYYY-MM-DD-my-batch-job/` using the current date

#### Scenario: Archive with incomplete items warns
- **WHEN** user runs `/nightshift:archive my-batch-job` and `qsv` finds rows with non-done statuses in any task column
- **THEN** the system SHALL warn the user about incomplete items and prompt for confirmation before archiving

### Requirement: Add task command
The system SHALL provide a `/nightshift:add-task` skill that adds a task definition to a shift.

#### Scenario: Add task to existing shift
- **WHEN** user runs `/nightshift:add-task my-batch-job`
- **THEN** the system SHALL prompt for task name, steps, and configuration, and write a task file under `.nightshift/my-batch-job/`

### Requirement: Update table command
The system SHALL provide a `/nightshift:update-table` skill that adds rows, modifies metadata, or resets failed items in a shift table.

#### Scenario: Update table interactively
- **WHEN** user runs `/nightshift:update-table my-batch-job`
- **THEN** the system SHALL allow the user to add, modify, or reset rows in `.nightshift/my-batch-job/table.csv`

### Requirement: Test task command
The system SHALL provide a `/nightshift:test-task` skill that dry-runs one task on one item without state changes.

#### Scenario: Test task in read-only mode
- **WHEN** user runs `/nightshift:test-task my-batch-job`
- **THEN** the system SHALL prompt for task and item selection, then invoke `/nightshift:do-task` with `--read-only`, without modifying `table.csv`

### Requirement: Internal do-task command
The system SHALL provide a `/nightshift:do-task` skill that the manager invokes as a `claude -p` subprocess to execute one task on one item. This skill is internal — users do not normally invoke it directly.

#### Scenario: Manager dispatches via do-task
- **WHEN** the manager processes an item with task `<task>`
- **THEN** it SHALL spawn `claude -p "/nightshift:do-task <shift> <task> <id>"` via `dispatch-batch.sh` and parse the resulting stream-json output
