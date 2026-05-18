# nightshift-commands Specification

## Purpose
Defines the user-facing Nightshift Claude Code skills (create, add-task, update-table, start, test-task, archive, doctor) plus internal skills required by the manager. Skills are distributed via the Claude Code plugin marketplace and invoked under the `/nightshift:` namespace.

## Requirements
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

#### Scenario: Start without shift name prompts selection
- **WHEN** user runs `/nightshift:start` without a name and multiple active shifts exist
- **THEN** the system SHALL list available shifts and prompt the user to select one

#### Scenario: All items complete
- **WHEN** user runs `/nightshift:start my-batch-job` and all item-task statuses are `done`
- **THEN** the system SHALL report that the shift is complete and suggest archiving with `/nightshift:archive`

#### Scenario: Pre-flight reads table status with qsv
- **WHEN** `/nightshift:start` performs pre-flight checks and qsv is available
- **THEN** it SHALL use `qsv count`, `qsv search`, and `qsv table` to read and display the table summary instead of reading the full file with the Read tool

#### Scenario: Supervisor handles manager completion
- **WHEN** the manager returns its completion output
- **THEN** the supervisor SHALL parse the final counts from the manager's completion output and proceed to the final report

#### Scenario: Supervisor does not gate batches
- **WHEN** the manager is processing batches within a single session
- **THEN** the supervisor SHALL NOT intervene, re-invoke, or run termination checks between batches

#### Scenario: Supervisor reads progress from manager output
- **WHEN** the supervisor needs to determine final shift status after the manager returns
- **THEN** it SHALL parse the final counts from the manager's completion output

### Requirement: Archive shift command
The system SHALL provide a `/nightshift:archive` skill that moves a completed shift to the archive directory with a date prefix. The status check SHALL use `qsv search`.

#### Scenario: Archive a shift
- **WHEN** user runs `/nightshift:archive my-batch-job`
- **THEN** the system SHALL move `.nightshift/my-batch-job/` to `.nightshift/archive/YYYY-MM-DD-my-batch-job/` using the current date

#### Scenario: Archive with incomplete items warns
- **WHEN** user runs `/nightshift:archive my-batch-job` and `qsv` finds rows with non-done statuses in any task column
- **THEN** the system SHALL warn the user about incomplete items and prompt for confirmation before archiving

#### Scenario: No shift name prompts selection
- **WHEN** user runs `/nightshift:archive` without a name
- **THEN** the system SHALL list available shifts and prompt the user to select one

### Requirement: Add task command
The system SHALL provide a `/nightshift:add-task` skill that adds a task definition to a shift. The column addition SHALL use `qsv enum`.

#### Scenario: Add task to existing shift
- **WHEN** user runs `/nightshift:add-task my-batch-job`
- **THEN** the system SHALL prompt for task name, steps, and configuration, and write a task file under `.nightshift/my-batch-job/`

#### Scenario: Add task to shift updates table
- **WHEN** user runs `/nightshift:add-task my-batch-job` and provides task details
- **THEN** the system SHALL create a new task file in `.nightshift/my-batch-job/`, add a corresponding status column to `table.csv` using `qsv enum --constant todo --new-column <task-name>` initialized to `todo` for all rows, and update `manager.md` task order

#### Scenario: Add task interactively
- **WHEN** user runs `/nightshift:add-task` without specifying a shift
- **THEN** the system SHALL prompt for shift selection and then guide the user through defining the task's configuration, steps, and validation sections

#### Scenario: Task name conflicts with existing task
- **WHEN** a task is added with a name that matches an existing task file
- **THEN** the system SHALL report the conflict and suggest a different name

#### Scenario: Skill prompts for execution-config fields
- **WHEN** the user is creating a new task interactively
- **THEN** the skill SHALL describe the optional Configuration fields (`model: <name>`, `working_dir: <path-or-placeholder>`, `worktree: true|false`) and their effects, allowing the user to set or omit each

#### Scenario: Skill records execution-config fields verbatim
- **WHEN** the user supplies values for `model`, `working_dir`, or `worktree`
- **THEN** the skill SHALL write them into the task file's Configuration section as `- key: value` lines, without normalizing or validating values (validation happens at dispatch time)

### Requirement: Test task command
The system SHALL provide a `/nightshift:test-task` skill that dry-runs one task on one item without state changes. Row data SHALL be read using `qsv slice` and `qsv select`.

#### Scenario: Test task in read-only mode
- **WHEN** user runs `/nightshift:test-task my-batch-job`
- **THEN** the system SHALL prompt for task and item selection, then invoke `/nightshift:do-task` with `--read-only`, without modifying `table.csv`

#### Scenario: Test specific task and item
- **WHEN** user runs `/nightshift:test-task my-batch-job` and specifies task "create_page" and item 3 (1-based display label)
- **THEN** the system SHALL extract the item's data using `qsv slice --index 2 table.csv` (converting 1-based display label to 0-based qsv index), execute the task steps, run self-validation, and display the full results without updating table.csv

#### Scenario: Test prompts for task and item
- **WHEN** user runs `/nightshift:test-task my-batch-job` without specifying task or item
- **THEN** the system SHALL use `qsv headers --just-names` to list available task columns and prompt for task selection, then use `qsv count` to determine the valid item range and prompt for an item number (displayed as 1-based)

#### Scenario: Test reports detailed results
- **WHEN** a test-task execution completes
- **THEN** the system SHALL display: each step's outcome (pass/fail), any captured values, each validation criterion result, and an overall pass/fail summary

#### Scenario: Test-task does not mutate table
- **WHEN** a user invokes `/nightshift:test-task my-batch-job` and the dev subprocess completes execution
- **THEN** `table.csv` and `manager.md` SHALL be byte-identical to their state before the invocation

#### Scenario: Test-task invocation includes read-only flag
- **WHEN** the test-task skill spawns the dev subprocess
- **THEN** the invocation SHALL pass `--read-only` as the 4th positional argument to `/nightshift:do-task` so the skill's mutation paths (status write, recommendation application) are bypassed

#### Scenario: Test-task includes safety boundary in dev prompt
- **WHEN** the test-task skill spawns the dev subprocess
- **THEN** the invocation prompt SHALL include a boundary line directing the dev to not modify `table.csv`, `manager.md`, or the task file — leveraging auto-mode classifier deny signals as a secondary safeguard

### Requirement: Update table command
The system SHALL provide a `/nightshift:update-table` skill that adds rows, modifies metadata, or resets failed items in a shift table. Row appending SHALL use `qsv cat rows`.

#### Scenario: Update table interactively
- **WHEN** user runs `/nightshift:update-table my-batch-job`
- **THEN** the system SHALL allow the user to add, modify, or reset rows in `.nightshift/my-batch-job/table.csv`

#### Scenario: Add rows from data source
- **WHEN** user runs `/nightshift:update-table my-batch-job` and provides new item data
- **THEN** the system SHALL construct a temporary CSV with the new rows and append them to `table.csv` using `qsv cat rows`, with all task status columns set to `todo`

#### Scenario: Modify metadata columns
- **WHEN** user requests updating a metadata column across multiple rows
- **THEN** the system SHALL use `qsv edit -i` for individual cell updates or construct the updated CSV and write it back, while preserving all status columns

#### Scenario: Reset failed items
- **WHEN** user requests resetting failed items for a specific task
- **THEN** the system SHALL identify failed rows using `qsv search --exact failed --select <task-column>` and update each to `todo` using `qsv edit -i`

#### Scenario: Confirm destructive changes
- **WHEN** a table update would modify status columns or remove rows
- **THEN** the system SHALL display a summary of changes and prompt for confirmation before applying

### Requirement: Internal do-task command
The system SHALL provide a `/nightshift:do-task` skill that the manager invokes as a `claude -p` subprocess to execute one task on one item. This skill is internal — users do not normally invoke it directly. The skill SHALL resolve the workspace root by reading the `NIGHTSHIFT_WORKSPACE_ROOT` environment variable, falling back to `pwd` only when the env var is unset.

#### Scenario: Manager dispatches via do-task
- **WHEN** the manager processes an item with task `<task>`
- **THEN** it SHALL spawn `claude -p "/nightshift:do-task <shift> <task> <id>"` via `dispatch-batch.sh` and parse the resulting stream-json output

#### Scenario: Skill receives positional arguments
- **WHEN** the skill is invoked as `/nightshift:do-task <shift> <task> <item-id>`
- **THEN** `$ARGUMENTS` SHALL contain the three (or four, with `--read-only`) positional arguments, and the skill body SHALL parse them in order

#### Scenario: Skill resolves task artifacts via NIGHTSHIFT_WORKSPACE_ROOT
- **WHEN** the skill is invoked with `NIGHTSHIFT_WORKSPACE_ROOT` set
- **THEN** it SHALL read `$NIGHTSHIFT_WORKSPACE_ROOT/.nightshift/<shift>/manager.md`, `$NIGHTSHIFT_WORKSPACE_ROOT/.nightshift/<shift>/<task>.md`, and the matching row from `$NIGHTSHIFT_WORKSPACE_ROOT/.nightshift/<shift>/table.csv` before executing any task step, regardless of its own cwd

#### Scenario: Skill falls back to pwd when env var unset
- **WHEN** the skill is invoked directly (e.g., a user runs `claude -p "/nightshift:do-task ..."` without going through `dispatch-batch.sh`) and `NIGHTSHIFT_WORKSPACE_ROOT` is not set
- **THEN** the skill SHALL use `pwd` as the workspace root for all shift-artifact paths, preserving pre-3.1 behavior

#### Scenario: Skill disables model auto-invocation
- **WHEN** `plugins/nightshift/skills/do-task/SKILL.md` is parsed
- **THEN** its YAML frontmatter SHALL include `disable-model-invocation: true`

#### Scenario: Skill pre-approves CSV operations
- **WHEN** `plugins/nightshift/skills/do-task/SKILL.md` is parsed
- **THEN** its YAML frontmatter `allowed-tools` field SHALL include `Bash(qsv *)` and `Bash(flock *)`

### Requirement: Start-shift skill uses forked manager
The system SHALL provide a `/nightshift:start` skill that begins or resumes shift execution by forking into the `manager` subagent with the skill body as the task prompt. The skill body SHALL include pre-flight summary state (total items, done count, failed count, todo count per task) inlined via dynamic context injection before the manager subagent receives the prompt. The manager subagent SHALL dispatch dev work as `claude -p` subprocesses via the bundled `dispatch-batch.sh` helper, NOT via the `Agent` tool.

#### Scenario: Start a new shift forks manager
- **WHEN** a user invokes `/nightshift:start my-batch-job` in Claude Code with a valid shift directory containing `todo` items
- **THEN** the skill SHALL fork the conversation into the `manager` subagent with pre-flight counts inlined and the manager SHALL begin processing items by spawning dev subprocesses

#### Scenario: Start a complete shift
- **WHEN** a user invokes `/nightshift:start my-batch-job` and all items are already `done`
- **THEN** the skill SHALL report that the shift is complete and suggest `/nightshift:archive` instead of forking the manager

#### Scenario: Start a shift with no items
- **WHEN** a user invokes `/nightshift:start my-batch-job` and `table.csv` has no rows
- **THEN** the skill SHALL report that the shift has no items and suggest `/nightshift:update-table` first

#### Scenario: Start a shift with no tasks
- **WHEN** a user invokes `/nightshift:start my-batch-job` and `table.csv` has no task columns
- **THEN** the skill SHALL report that the shift has no tasks and suggest `/nightshift:add-task` first

#### Scenario: Manager uses dispatch-batch.sh for all dispatch
- **WHEN** the forked manager subagent dispatches work to dev
- **THEN** it SHALL invoke `${CLAUDE_SKILL_DIR}/scripts/dispatch-batch.sh` (installed alongside the start skill) for both single-item and multi-item batches, rather than calling `Agent(nightshift-dev)`

### Requirement: Skills disable model invocation
The system SHALL set `disable-model-invocation: true` in the frontmatter of every Nightshift skill so that Claude does not auto-invoke side-effecting workflows. Users SHALL invoke skills explicitly via `/nightshift:<skill-name>` typing.

#### Scenario: All skill SKILL.md files set the flag
- **WHEN** the plugin is inspected
- **THEN** every `plugins/nightshift/skills/*/SKILL.md` file SHALL contain `disable-model-invocation: true` in its YAML frontmatter

### Requirement: Skills pre-approve CSV operations
The system SHALL set `allowed-tools: Bash(qsv *) Bash(flock *)` in the frontmatter of every Nightshift skill that performs CSV operations, so that qsv and flock invocations execute without per-call permission prompts.

#### Scenario: All skill SKILL.md files include allowed-tools
- **WHEN** the plugin is inspected
- **THEN** every `plugins/nightshift/skills/*/SKILL.md` file that performs CSV operations SHALL include `Bash(qsv *)` and `Bash(flock *)` in its `allowed-tools` field

### Requirement: Skills accept shift name argument
The system SHALL allow each skill to accept a shift name as an argument via Claude Code's `$ARGUMENTS` (or `$0`) substitution.

#### Scenario: Skill receives shift name
- **WHEN** a user invokes `/nightshift:start my-batch-job`
- **THEN** the skill body SHALL receive `my-batch-job` substituted for `$ARGUMENTS` (or `$0`) at render time

#### Scenario: Skill prompts when argument omitted
- **WHEN** a user invokes a skill that requires a shift name (e.g., `/nightshift:start`) without providing one
- **THEN** the skill SHALL list the available shift directories and ask the user to pick one (using `AskUserQuestion` when more than one is available, auto-selecting when only one is available)
