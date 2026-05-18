## Context

Nightshift currently has two install paths: an npm CLI (`nightshift init`) that scaffolds `.claude/` artifacts into a target project, and a Claude Code Plugin manifest that ships the same files via marketplace discovery. Cross-repo testing showed that the npm CLI only works for the one project it was run in — Claude Code's skill discovery checks `<cwd>/.claude/skills/` and `~/.claude/skills/`, so per-project installs are invisible from other projects.

The plugin marketplace path solves discovery natively (plugins install user-level by design, automatically discovered from every session). It also handles versioning, auto-update, and distribution mechanics that the CLI would have to reinvent.

Maintaining both paths is high-effort and low-value: ~600 lines of scaffolder/CLI code exist to do what `/plugin install` does in one step. The CLI also forces docs to explain two paths plus warn about their collision case.

This change collapses to plugin-marketplace-only and treats the npm package as a deprecation artifact.

## Goals / Non-Goals

**Goals:**
- Establish `johndaskovsky/nightshift` as a Claude Code marketplace hosting the `nightshift` plugin.
- Restructure the repo so the plugin lives under `plugins/nightshift/` with its canonical manifest, agents, and skills — no build-step materialization.
- Rename skill folders to drop the `nightshift-` prefix (so namespaced commands read as `/nightshift:start`, not `/nightshift:nightshift-start`).
- Delete templates, scaffolder, settings-merge, CLAUDE.md merge, dependency-check, and gitignore-scaffold modules from `src/`.
- Reduce `nightshift init` to a deprecation message that points users to `/plugin install`.
- Replace install-time dep-checking with a `/nightshift:doctor` skill.
- Move lazy `.nightshift/.gitignore` creation into `init-shift.sh`.
- Rewrite README to lead with the plugin install path.
- Update tests: drop scaffolder tests, adapt integration tests to use `--plugin-dir`.
- Bump to `4.0.0` (major: breaking install path and breaking slash-command names).

**Non-Goals:**
- Not unpublishing the npm package. Keep it published as a deprecation artifact so existing `npm install` references don't 404.
- Not migrating existing users' `.nightshift/` shift data. Shifts are unaffected — the plugin's skills still resolve `.nightshift/<shift>/` relative to cwd.
- Not building any one-shot migration tool (e.g., for cleaning up old project-local installs). Stale `.claude/skills/nightshift-*/` directories in user projects are harmless and Claude Code's precedence rules let project copies override the plugin if present. Users can delete them manually if they prefer.
- Not setting up CI to publish the marketplace. Marketplace updates are git pushes — no separate publish step needed.

## Decisions

### 1. Single-plugin marketplace in the same repo

A standalone `johndaskovsky/nightshift` git repo hosts both the marketplace catalog and the plugin. Layout:

```
nightshift/
├── .claude-plugin/
│   └── marketplace.json              ← catalog: name=nightshift, lists 1 plugin
├── plugins/
│   └── nightshift/
│       ├── .claude-plugin/
│       │   └── plugin.json           ← plugin manifest
│       ├── agents/
│       │   └── manager.md
│       └── skills/
│           ├── start/SKILL.md
│           ├── create/SKILL.md
│           ├── add-task/SKILL.md
│           ├── update-table/SKILL.md
│           ├── do-task/SKILL.md
│           ├── test-task/SKILL.md
│           ├── archive/SKILL.md
│           └── doctor/SKILL.md
├── src/cli/                           ← deprecation stub only
├── package.json                       ← npm deprecation artifact
└── README.md                          ← leads with /plugin install
```

User commands:
```
/plugin marketplace add johndaskovsky/nightshift
/plugin install nightshift@nightshift
```

The `@nightshift` suffix is the marketplace name (from `marketplace.json:name`). The plugin name is `nightshift`. So the install reads `/plugin install <plugin>@<marketplace>` = `/plugin install nightshift@nightshift`. Cleaner than `nightshift@johndaskovsky-nightshift`.

**Alternative considered:** separate `johndaskovsky/claude-marketplace` repo cataloging multiple plugins, with the nightshift plugin in its own repo. Rejected because (a) Nightshift is the only plugin in flight, (b) having marketplace + plugin in one repo means atomic releases and one source of truth.

### 2. Rename skill folders, drop the `nightshift-` prefix

Plugin skills are always namespaced by the plugin name. `skills/nightshift-start/` would surface as `/nightshift:nightshift-start`. Renaming to `skills/start/` gives the cleaner `/nightshift:start`.

This is breaking, but it's a one-time rename documented in the CHANGELOG. Internal references (manager subagent prose, `dispatch-batch.sh` log/manifest paths, README, init-shift.sh's printed next-step hints) all need updates.

The manager agent file similarly renames: `agents/nightshift-manager.md` → `agents/manager.md`. The agent name inside its YAML frontmatter follows suit.

### 3. Eliminate the templates/ layer

Today `templates/claude/` is the source of truth for skills/agents, and `build.js` copies them to `agents/` and `skills/` at the repo root so Claude Code's plugin discovery finds them. With no npm CLI to scaffold them into target projects, the templates layer adds no value — it just doubles the surface area for any edit.

Author skills and agents directly under `plugins/nightshift/`. Delete `templates/`. `build.js` is reduced to TypeScript compilation only.

### 4. `nightshift init` becomes a deprecation stub

Replace the entire `init.ts` body with:

```ts
console.log("nightshift init is deprecated.\n\nNightshift is now distributed as a Claude Code plugin. Install it with:\n\n  /plugin marketplace add johndaskovsky/nightshift\n  /plugin install nightshift@nightshift\n\nSee https://github.com/johndaskovsky/nightshift for details.");
```

Exit 0 so existing CI scripts don't error. The CLI's `--version` flag still works. All other subcommands are unaffected (there are none).

Delete `src/core/scaffolder.ts`, `src/core/dependencies.ts`, `src/core/templates.ts`, and the matching re-exports in `src/index.ts`. The chalk/ora dependencies become unused; they can be removed from `package.json` to slim the deprecation artifact, though that's a nice-to-have.

### 5. Dependency check moves to a skill

Today `src/core/dependencies.ts` checks `qsv` and `flock` availability at install time and prints install hints. Equivalent functionality as a skill:

```
plugins/nightshift/skills/doctor/SKILL.md
```

Invoked as `/nightshift:doctor`. Runs `command -v qsv && command -v flock && command -v jq` via Bash and prints findings. User runs it once after installing the plugin (or any time they suspect a missing dep).

Document in the README as the first step after `/plugin install`.

### 6. Project bootstrap moves to `/nightshift:create`

The plugin install handles the *runtime* layer (skills, agent — at user level, automatic). But each project that uses Nightshift still needs a *project* layer: `.nightshift/` exists, `.nightshift/archive/` exists, `.nightshift/.gitignore` exists. Today the npm CLI handles all of this at `nightshift init` time.

With no installer, the only natural place to do project bootstrap is the first user-invoked skill that touches `.nightshift/` — which is `/nightshift:create`. Its `init-shift.sh` script gains an idempotent bootstrap block at the top:

```bash
# Project bootstrap — runs on every invocation, no-op if already set up.
mkdir -p .nightshift/archive
if [ ! -f .nightshift/.gitignore ]; then
  cat > .nightshift/.gitignore <<'EOF'
table.csv.bak
**/logs/
.batch-manifest.json
EOF
fi
```

Cheap (a few `mkdir -p` calls plus one file existence check). Idempotent (re-runs are no-ops). Self-healing (a user who accidentally deletes `.nightshift/archive/` gets it back on next `/nightshift:create`).

Other `nightshift init` responsibilities, restated for clarity:

| Old init action | New home |
|---|---|
| Copy agents/skills to `.claude/` | Claude Code plugin install (automatic) |
| Merge `Bash(qsv|flock|claude *)` permissions | `allowed-tools` frontmatter on each SKILL.md / agent file |
| Write CLAUDE.md block | Removed entirely (already decided) |
| Create `.nightshift/archive/` | `/nightshift:create` (init-shift.sh bootstrap block) |
| Create `.nightshift/.gitignore` | `/nightshift:create` (init-shift.sh bootstrap block) |
| Check qsv/flock | `/nightshift:doctor` skill |
| First-run banner / next-steps | README (post-install instructions) |
| Clean up legacy nightshift-dev.md | Not needed — 3.x users already migrated past this |

### 7. Permissions allowlist: rely on `allowed-tools` frontmatter

Every SKILL.md already declares `allowed-tools: Bash(qsv *) Bash(flock *) Bash(test *)`. The manager agent file should similarly declare `Bash(claude *)` for spawning dev subprocesses (verify it does; add if missing). With this in place, no `permissions.allow` merge is needed.

If testing reveals that `allowed-tools` declarations aren't auto-granted in plugins, fall back to a README note instructing users to add the allows to `~/.claude/settings.json` once.

### 8. npm package as deprecation artifact

Keep `@johndaskovsky/nightshift` published. Bump to `4.0.0`. The package's `README.md` (also the npm landing page) says "Nightshift is now distributed as a Claude Code plugin" and links to the marketplace install. The `nightshift init` binary prints the same message. Don't `npm deprecate` for now — a clear README pivot is enough.

If the npm package eventually needs a final shutoff (say someone keeps using it and breaks), we can `npm deprecate` later.

## Risks / Trade-offs

- **[Risk]** `allowed-tools` frontmatter in plugin skills may not be auto-granted by Claude Code — users could see permission prompts on every `qsv`/`flock` call. **Mitigation:** test locally with `--plugin-dir` before publishing. If prompts appear, add a one-time `permissions.allow` instruction to the README.
- **[Risk]** Users on the npm CLI may not notice the deprecation if they're invoking `nightshift init` in CI. **Mitigation:** message exits 0 so nothing breaks; the message itself is loud enough that humans reviewing CI logs will see it. README + CHANGELOG also call this out.
- **[Risk]** Existing project-local installs (`<project>/.claude/skills/nightshift-*/`) will still be present in users' repos and may shadow the plugin via Claude Code's precedence. **Mitigation:** documented in README — users delete them when they want the plugin path to take over.
- **[Risk]** Skill rename breaks any user automation that types `/nightshift-start` etc. **Mitigation:** CHANGELOG entry; the new command names are similar (`/nightshift:start`) and discoverable via `/help`.
- **[Trade-off]** Loss of install-time deps check. Users with missing `qsv`/`flock`/`jq` will see runtime errors from `dispatch-batch.sh` or skill scripts instead of a friendly check. **Mitigation:** `/nightshift:doctor` skill + a README "first run" section that says "run /nightshift:doctor first".
- **[Trade-off]** No more banner / next-steps output. The plugin install is silent (apart from Claude Code's own confirmation). The README has to carry the post-install instructions.

## Migration Plan

1. Land all repo restructuring + code changes on a feature branch.
2. Test locally: `claude --plugin-dir ./plugins/nightshift`. Walk through `/nightshift:doctor`, `/nightshift:create`, `/nightshift:add-task`, `/nightshift:start` on a small fixture.
3. Test marketplace path: `/plugin marketplace add ./` from a sibling directory; `/plugin install nightshift@nightshift`. Repeat the skill walkthrough.
4. Tag `v4.0.0` and push. Marketplace consumers pick up the new version on next `/plugin marketplace update` (or immediately if they pin via `ref`).
5. Publish npm `@johndaskovsky/nightshift@4.0.0` as the deprecation artifact.
6. CHANGELOG entry covers: (a) install path change, (b) slash command rename, (c) location of legacy CLI.

Rollback: this is a big change; the rollback is "git revert + republish 3.1.0 on npm." Marketplaces don't have a "yank" but users can pin to a prior `ref`.

## Open Questions

- Is `allowed-tools` in a plugin skill's frontmatter auto-granted? Confirm in local test. If not, README needs a `permissions.allow` instruction.
- Should the marketplace catalog have a stable `metadata.pluginRoot: "./plugins"` so plugin sources can be written as `"source": "nightshift"`? Cosmetic only; either works. Lean toward yes for cleanliness.
- Should we keep `chalk`/`ora` dependencies for the deprecation stub, or strip them? Strip; the stub is a single `console.log`. Saves ~200KB in the npm package.
