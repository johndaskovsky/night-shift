---
name: nightshift:doctor
description: Verify that Nightshift's required system dependencies (qsv, flock, jq) are installed and on PATH. Use when the user invokes /nightshift:doctor.
disable-model-invocation: true
allowed-tools: Bash(command *) Bash(qsv *) Bash(flock *) Bash(jq *)
---

Check whether Nightshift's required system dependencies are installed.

## Pre-flight

Run the dependency probes:

```!
{
  printf 'qsv: '
  if command -v qsv >/dev/null 2>&1; then qsv --version 2>/dev/null | head -1; else echo MISSING; fi
  printf 'flock: '
  if command -v flock >/dev/null 2>&1; then flock --version 2>/dev/null | head -1; else echo MISSING; fi
  printf 'jq: '
  if command -v jq >/dev/null 2>&1; then jq --version 2>/dev/null; else echo MISSING; fi
}
```

## Report

For each dependency, report status using the pre-flight output above:

- **All three present**: report a single line per dependency with a checkmark and the detected version. Conclude with: "Nightshift is ready to use. Try `/nightshift:create <shift-name>` to start a shift."
- **One or more missing**: for each missing dependency, report a warning line with the install hint:
  - `qsv` missing → `brew install qsv` (or download from https://github.com/dathere/qsv/releases for non-Homebrew platforms)
  - `flock` missing → `brew install flock` (or use the version bundled with `util-linux` on Linux)
  - `jq` missing → `brew install jq` (or see https://stedolan.github.io/jq/)
  - Conclude with: "Install the missing dependencies, then re-run `/nightshift:doctor`."

## Guardrails

- Do not auto-install anything. This skill only reports.
- Do not modify any files. This skill is read-only.
- If the pre-flight output is unparseable, report it verbatim and ask the user to investigate.
