## MODIFIED Requirements

### Requirement: Gitignore file generation
The system SHALL create a `.nightshift/.gitignore` file the first time the user runs `/nightshift:create` in a project. The creation SHALL happen inside the `/nightshift:create` skill's bundled `init-shift.sh` script and SHALL be idempotent — if the file already exists, the script SHALL NOT overwrite or modify it.

#### Scenario: First /nightshift:create in a project creates .gitignore
- **WHEN** a user runs `/nightshift:create my-shift` in a directory that has no `.nightshift/.gitignore`
- **THEN** the system SHALL create `.nightshift/.gitignore` containing `table.csv.bak`, `**/logs/`, and `.batch-manifest.json`

#### Scenario: Subsequent /nightshift:create leaves existing .gitignore untouched
- **WHEN** a user runs `/nightshift:create another-shift` and `.nightshift/.gitignore` already exists (with any content, framework-managed or user-customized)
- **THEN** the system SHALL NOT overwrite or modify the existing `.nightshift/.gitignore`

### Requirement: Gitignore content
The default `.nightshift/.gitignore` content SHALL list patterns for transient files produced during shift execution. The default content created by `/nightshift:create` SHALL contain `table.csv.bak`, `**/logs/`, and `.batch-manifest.json`.

#### Scenario: Default ignore patterns include all transient artifacts
- **WHEN** `.nightshift/.gitignore` is created by `/nightshift:create`
- **THEN** it SHALL include lines for `table.csv.bak`, `**/logs/`, and `.batch-manifest.json`

## REMOVED Requirements

### Requirement: Init creates .gitignore
**Reason**: `nightshift init` is deprecated and performs no scaffolding. Project bootstrap (including `.nightshift/.gitignore`) moves to `/nightshift:create`.

**Migration**: First invocation of `/nightshift:create` in a project creates the file.

### Requirement: Existing .gitignore is overwritten
**Reason**: The skill is intentionally non-destructive — it never overwrites a user's existing gitignore. If the framework default needs updating, users update their copy manually.

**Migration**: None.

### Requirement: Gitignore idempotency
**Reason**: Subsumed by the new "subsequent /nightshift:create leaves existing .gitignore untouched" scenario above.

**Migration**: None.

### Requirement: Gitignore summary output
**Reason**: `/nightshift:create` does not currently print framework-managed file actions in a summary format. The skill mentions the bootstrap implicitly through its output.

**Migration**: None.
