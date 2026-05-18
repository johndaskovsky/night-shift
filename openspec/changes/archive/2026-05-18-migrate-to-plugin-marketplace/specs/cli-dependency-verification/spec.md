## REMOVED Requirements

### Requirement: CLI dependency detection
**Reason**: The `nightshift init` CLI is deprecated and performs no work. Dependency checking moves to the `/nightshift:doctor` skill (see the `nightshift-doctor` capability spec).

**Migration**: After installing the plugin, users run `/nightshift:doctor` once to verify `qsv`, `flock`, and `jq` are on PATH. The skill prints `brew install` hints for any missing dependencies.

### Requirement: Dependency check is non-blocking
**Reason**: There is no install-time check to be blocking or non-blocking. The doctor skill is opt-in and never gates anything.

**Migration**: None.

### Requirement: Dependency summary section
**Reason**: The init command has no summary output anymore — it prints a deprecation message and exits.

**Migration**: None.

### Requirement: Shared dependency check utility
**Reason**: The `src/core/dependencies.ts` module is deleted along with the rest of the scaffolder. The equivalent logic moves into the doctor skill's body.

**Migration**: None.
