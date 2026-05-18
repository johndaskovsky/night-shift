## Why

Cross-repo testing revealed that the npm CLI installer (`nightshift init`) only works for the single project it was run in — skills installed at `<project>/.claude/` are not discoverable from any other project. The only working install location is `~/.claude/`, which makes the per-project install model fundamentally wrong for how users actually want to use Nightshift.

Claude Code's plugin-marketplace model solves this natively: plugins install to `~/.claude/plugins/cache/`, are discoverable from every session in every project, version themselves via git tags, and auto-update. The current dual distribution (npm CLI + plugin manifest) duplicates effort, requires us to maintain a scaffolder that exists only to move files into Claude Code's expected layout, and forces docs to explain both paths plus their collision case.

Going plugin-marketplace-only collapses Nightshift's distribution to one path with less code to maintain, better UX (one-time install via `/plugin install`, automatic updates), and a natural cross-repo story (the plugin is user-level by design).

## What Changes

- **BREAKING (install)** Primary install path becomes `/plugin marketplace add johndaskovsky/nightshift` + `/plugin install nightshift@nightshift`. The `nightshift init` npm CLI is deprecated.
- **BREAKING (slash commands)** Skill folder names drop the `nightshift-` prefix (e.g., `skills/nightshift-start/` → `skills/start/`). Users now invoke `/nightshift:start`, `/nightshift:create`, etc., instead of `/nightshift-start`. This is because plugin skills are always namespaced by the plugin name, so `/nightshift:nightshift-start` would be ugly.
- Repo restructure: the plugin moves to `plugins/nightshift/` with its own `.claude-plugin/plugin.json`. A new `.claude-plugin/marketplace.json` at the repo root catalogs the one plugin. The repo doubles as both the marketplace and the plugin's source.
- The manager agent file is renamed from `nightshift-manager.md` to `manager.md` (its namespacing comes from the plugin, not the filename).
- A new `/nightshift:doctor` skill replaces the install-time `dependencies.ts` check: users run it once after install to verify `qsv`, `flock`, and `jq` are present.
- `templates/claude/` is deleted. Plugin files are authored directly under `plugins/nightshift/` with no build-step copy.
- `src/core/scaffolder.ts`, `src/core/dependencies.ts`, and `src/core/templates.ts` are deleted. `src/cli/commands/init.ts` is reduced to a stub that prints a deprecation message pointing users to the plugin install path and exits 0.
- `build.js` is reduced to TypeScript compilation only; no plugin-artifact materialization (because the plugin files live in their canonical location now).
- All project-level bootstrap work that `nightshift init` used to do moves into `/nightshift:create` (specifically its `init-shift.sh` script). On every invocation, the script idempotently ensures the project has `.nightshift/`, `.nightshift/archive/`, and `.nightshift/.gitignore` before creating the requested shift directory. This means a fresh project never needs a separate "init" step — the first `/nightshift:create` does it all.
- README is rewritten to lead with the plugin install path. A short "Deprecated: npm CLI" section preserves the old commands for archival but pushes users to the plugin.
- AGENTS.md (the contributor README) is updated to describe the new repo layout.
- Existing tests (`test/init-tests.ts`, `test/run-tests.ts`) are either deleted (init scaffolder tests, no longer applicable) or updated (run-tests integration suite, which needs to launch Claude Code with `--plugin-dir`).
- Package version bumps to `4.0.0` (breaking install path).
- The npm package stays published but is the deprecation surface — `nightshift init` only prints the migration message.

## Capabilities

### New Capabilities
- `plugin-distribution`: defines the marketplace catalog (`marketplace.json`), the plugin manifest (`plugin.json`), and the canonical layout under `plugins/nightshift/`.
- `nightshift-doctor`: a `/nightshift:doctor` skill that verifies system dependencies (`qsv`, `flock`, `jq`) and prints install hints. Replaces the install-time check from the deprecated CLI.

### Modified Capabilities
- `nightshift-installer`: drastically narrowed — `nightshift init` becomes a deprecation stub. Scaffolder, settings-merge, templates, and dependency-check requirements are removed.
- `nightshift-commands`: slash command names change from `/nightshift-<skill>` to `/nightshift:<skill>`. Skill folder names drop the `nightshift-` prefix.
- `nightshift-agents`: manager agent moves from `nightshift-manager.md` to `manager.md` and lives under `plugins/nightshift/agents/`.
- `cli-dependency-verification`: replaced by `nightshift-doctor` (the install-time check no longer runs).
- `gitignore-scaffold`: gitignore is now written by `init-shift.sh` on first shift creation, not at install time.
- `claude-code-target`: simplifies to plugin-marketplace-only; the npm CLI is no longer a primary path.

## Impact

- **Repository layout**: significant restructure. `templates/`, most of `src/`, and `agents/`/`skills/` (materialized at root) are removed; `plugins/nightshift/` becomes the canonical location.
- **User migration**: existing users on the npm CLI will hit a deprecation message and must run two `/plugin` commands. Existing `.nightshift/` shift data in their projects is unaffected — the plugin still resolves shifts against cwd.
- **CI / package consumers**: anyone scripting `nightshift init` in CI will see the deprecation but exit 0. They should migrate to `/plugin install` or seed the plugin cache via `CLAUDE_CODE_PLUGIN_SEED_DIR`.
- **Dependencies**: still require `qsv`, `flock`, `jq` on the user's machine. Now surfaced via `/nightshift:doctor` instead of install-time check.
- **Distribution**: only ship via marketplace going forward. npm package frozen as a deprecation artifact.
- **Tests**: init-tests.ts mostly deleted; run-tests.ts adapted to invoke `claude --plugin-dir ./plugins/nightshift` for integration.
