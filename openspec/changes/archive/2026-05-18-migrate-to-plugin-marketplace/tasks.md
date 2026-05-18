## 1. Repo restructure — create new plugin location

- [x] 1.1 Create `plugins/nightshift/.claude-plugin/plugin.json` from the existing root `.claude-plugin/plugin.json` (copy + adjust if needed)
- [x] 1.2 Create `plugins/nightshift/agents/manager.md` by copying the current `templates/claude/agents/nightshift-manager.md`, renaming the `name:` frontmatter field to `manager`
- [x] 1.3 Create `plugins/nightshift/skills/start/SKILL.md` from `templates/claude/skills/nightshift-start/SKILL.md` and copy its `scripts/` subdirectory
- [x] 1.4 Create `plugins/nightshift/skills/create/SKILL.md` from `templates/claude/skills/nightshift-create/SKILL.md` and copy its `scripts/` subdirectory
- [x] 1.5 Create `plugins/nightshift/skills/add-task/SKILL.md` from `templates/claude/skills/nightshift-add-task/SKILL.md`
- [x] 1.6 Create `plugins/nightshift/skills/update-table/SKILL.md` from `templates/claude/skills/nightshift-update-table/SKILL.md`
- [x] 1.7 Create `plugins/nightshift/skills/do-task/SKILL.md` from `templates/claude/skills/nightshift-do-task/SKILL.md`
- [x] 1.8 Create `plugins/nightshift/skills/test-task/SKILL.md` from `templates/claude/skills/nightshift-test-task/SKILL.md`
- [x] 1.9 Create `plugins/nightshift/skills/archive/SKILL.md` from `templates/claude/skills/nightshift-archive/SKILL.md` and copy its `scripts/` subdirectory
- [x] 1.10 Confirm all copied scripts retain executable bits (chmod 755 if needed)

## 2. Internal reference updates (new skill names)

- [x] 2.1 In `plugins/nightshift/agents/manager.md`: replace every reference to `/nightshift-<skill>` with `/nightshift:<skill>`, replace `nightshift-do-task` invocation with `nightshift:do-task`, update prose mentioning `nightshift-manager` → `manager`
- [x] 2.2 In each `SKILL.md`: update any cross-skill references (e.g. `/nightshift-add-task` → `/nightshift:add-task`); update `agent: nightshift-manager` → `agent: manager` in `start/SKILL.md` frontmatter
- [x] 2.3 In `plugins/nightshift/skills/start/scripts/dispatch-batch.sh`: update the `claude -p "/nightshift-do-task ..."` call to `claude -p "/nightshift:do-task ..."`
- [x] 2.4 In `plugins/nightshift/skills/create/scripts/init-shift.sh`: update next-step hints to use `/nightshift:` prefix
- [x] 2.5 In `plugins/nightshift/skills/start/scripts/preflight.sh`: update any error-message instructions referring to `/nightshift-` commands

## 3. Add project-level bootstrap to /nightshift:create

- [x] 3.1 At the top of `plugins/nightshift/skills/create/scripts/init-shift.sh`, add an idempotent bootstrap block: `mkdir -p .nightshift/archive` and create `.nightshift/.gitignore` (with `table.csv.bak`, `**/logs/`, `.batch-manifest.json`) only if it does not already exist
- [x] 3.2 Update the `create/SKILL.md` body to mention that the skill performs project bootstrap on first run
- [x] 3.3 Add a scenario test (or smoke instruction) for: fresh project with no `.nightshift/` → first `/nightshift:create` produces archive dir + gitignore + shift dir (covered by smoke task 12.4)

## 4. Add doctor skill

- [x] 4.1 Create `plugins/nightshift/skills/doctor/SKILL.md` with frontmatter (`disable-model-invocation: true`, `allowed-tools: Bash(command *)`) and body that checks `qsv`, `flock`, `jq` presence via `command -v` and prints brew install hints for missing ones
- [x] 4.2 Ensure doctor skill body uses only inline bash (no external script needed)

## 5. Add marketplace catalog

- [x] 5.1 Create `.claude-plugin/marketplace.json` at repo root with `name: nightshift`, owner info (`{ "name": "johndaskovsky" }`), `description`, and `plugins: [{ "name": "nightshift", "source": "./plugins/nightshift", "description": ... }]`
- [x] 5.2 Move or update existing root `.claude-plugin/plugin.json` — its content is now at `plugins/nightshift/.claude-plugin/plugin.json`, so the root file is removed (the marketplace catalog file replaces it at this location)
- [x] 5.3 Consider `metadata.pluginRoot: "./plugins"` so the `source` field can be `"nightshift"` instead of `"./plugins/nightshift"` (cosmetic; optional) — added; `source: "nightshift"` resolves via `metadata.pluginRoot`

## 6. Delete legacy locations

- [x] 6.1 Delete `templates/` directory in its entirety
- [x] 6.2 Delete the materialized `agents/` directory at repo root (now lives under `plugins/nightshift/agents/`)
- [x] 6.3 Delete the materialized `skills/` directory at repo root (now lives under `plugins/nightshift/skills/`)
- [x] 6.4 Delete `src/core/scaffolder.ts`
- [x] 6.5 Delete `src/core/dependencies.ts`
- [x] 6.6 Delete `src/core/templates.ts`
- [x] 6.7 Delete `src/core/` directory entirely if empty
- [x] 6.8 Clean up `src/index.ts` to only re-export what the deprecation stub needs (the `createProgram`/`run` exports from `src/cli/index.ts`)

## 7. Reduce nightshift init to a deprecation stub

- [x] 7.1 Replace the entire body of `src/cli/commands/init.ts` with a single console.log of the deprecation message + `/plugin` install commands, then return (exit 0)
- [x] 7.2 Remove all imports from `init.ts` that are no longer needed (scaffolder functions, ora, chalk if dropped)
- [x] 7.3 Decide on chalk/ora: either keep (for minor color in the deprecation message) or strip from package.json dependencies to slim the npm package — preferred: strip (done; removed from `dependencies` in package.json)
- [x] 7.4 Update the CLI `--version` flag to still work (it already does via `getVersion()`)

## 8. Build script cleanup

- [x] 8.1 Reduce `build.js` to: (a) clean `dist/`, (b) compile TypeScript, (c) sync the plugin manifest's `version` field with `package.json`. Remove materialization steps and skill-verification steps (skills now live in their canonical location and are not generated)
- [x] 8.2 Update the plugin-manifest path the build script edits to `plugins/nightshift/.claude-plugin/plugin.json`
- [x] 8.3 Verify the build still runs cleanly (`pnpm build`)

## 9. Test updates

- [x] 9.1 Delete `test/init-tests.ts` (the suite tested scaffolder/init behavior that no longer exists)
- [x] 9.2 Remove the `test:init` script from `package.json`
- [x] 9.3 In `test/run-tests.ts`: replace the `nightshift init` invocation with `claude --plugin-dir ./plugins/nightshift` for plugin loading
- [x] 9.4 In `test/run-tests.ts`: update all command references from `/nightshift-<skill>` to `/nightshift:<skill>` in the test prompts and assertions
- [x] 9.5 Update `test/run-tests.ts` checks: drop `.claude/settings.json`, `.claude/agents/`, `.claude/skills/` filesystem checks (these are now in `~/.claude/plugins/cache/...`, not the project); keep `.nightshift/` checks since project bootstrap still creates that
- [ ] 9.6 Run `pnpm test:integration` (or whatever remains) and verify it passes — DEFERRED to smoke testing phase (Group 12); requires live Claude Code session

## 10. Documentation

- [x] 10.1 Rewrite `README.md`:
  - Replace "Installation" section with `/plugin marketplace add johndaskovsky/nightshift` + `/plugin install nightshift@nightshift`
  - Add "First run" section telling users to run `/nightshift:doctor` to verify dependencies
  - Replace every `/nightshift-<skill>` reference with `/nightshift:<skill>`
  - Add "Deprecated: npm CLI" section explaining the old install path is no longer recommended
  - Remove the "Alternative: Claude Code Plugin" section (plugin is now the only path)
  - Add a brief "Permissions" note explaining that if Claude Code prompts for `Bash(qsv *)` or similar, users can add to `~/.claude/settings.json` once
- [x] 10.2 Rewrite `AGENTS.md` (contributor docs):
  - Update repo structure section to show `plugins/nightshift/` layout
  - Remove references to `templates/claude/`
  - Update test commands and instructions
  - Update slash-command references
- [x] 10.3 Add `CHANGELOG.md` entry for v4.0.0:
  - **BREAKING**: install path changed to plugin marketplace
  - **BREAKING**: slash commands renamed from `/nightshift-<skill>` to `/nightshift:<skill>`
  - Note the deprecation of `nightshift init`
  - Note the new `/nightshift:doctor` skill
- [x] 10.4 Update `package.json` description and keywords to reflect plugin-first distribution
- [x] 10.5 Add a top-level `MIGRATION.md` (or section in README) with the 3.x → 4.x migration steps for existing users — captured in CHANGELOG.md "Migration from 3.x" section plus README "Deprecated: npm CLI" section; no separate file

## 11. Version bump

- [x] 11.1 Update `package.json` version to `4.0.0`
- [x] 11.2 Verify `plugins/nightshift/.claude-plugin/plugin.json` version syncs to `4.0.0` after build
- [x] 11.3 Update any other version references (e.g., the README install-version pin if present) — none present; README doesn't pin a version

## 12. Smoke testing

- [ ] 12.1 From the repo root: `claude --plugin-dir ./plugins/nightshift` — verify Claude Code starts without plugin errors
- [ ] 12.2 Inside that session, run `/help` and confirm all `/nightshift:*` skills appear
- [ ] 12.3 Run `/nightshift:doctor` — confirm output reports dep status correctly (try with one missing, e.g., temporarily rename `qsv` on PATH)
- [ ] 12.4 In a clean temp directory with no `.nightshift/`: run `/nightshift:create test-shift` — confirm `.nightshift/archive/`, `.nightshift/.gitignore`, and `.nightshift/test-shift/` are all created
- [ ] 12.5 Re-run `/nightshift:create another-shift` in the same dir; confirm existing `.gitignore` is not overwritten
- [ ] 12.6 Walk through `/nightshift:add-task`, populate `table.csv`, run `/nightshift:start` on a tiny 1-item shift — confirm the manager dispatches `claude -p "/nightshift:do-task ..."` and the dev returns a result
- [ ] 12.7 Run `nightshift init` from the deprecated npm install — confirm the deprecation message prints and exit code is 0
- [ ] 12.8 From a sibling directory: `/plugin marketplace add ../nightshift` (or wherever the repo sits) then `/plugin install nightshift@nightshift` — confirm the same skills are now discoverable in a session where `--plugin-dir` is NOT passed

## 13. Final cleanup

- [x] 13.1 Run `git status` and verify no stale untracked files remain from the restructure
- [x] 13.2 Run `npx tsc --noEmit` — confirm typecheck is clean after deleting scaffolder/dependencies/templates modules
- [x] 13.3 Run `pnpm build` — confirm clean build
- [x] 13.4 Update `.gitignore` (root) if any materialized output paths are still listed (e.g., `agents/`, `skills/` at root) — removed `/agents` and `/skills` entries
- [x] 13.5 Self-review the diff: are there any remaining references to `templates/`, `nightshift-<skill>`, or `nightshift-manager` outside the openspec change docs? — Only remaining mentions are in CHANGELOG.md historical entries (correct; describing past versions)
