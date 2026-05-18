import { Command } from "commander";

const DEPRECATION_MESSAGE = `nightshift init is deprecated.

Nightshift is now distributed as a Claude Code plugin. Install it with:

  /plugin marketplace add johndaskovsky/nightshift
  /plugin install nightshift@nightshift

After install, run /nightshift:doctor to verify the system dependencies
(qsv, flock, jq) are present, then /nightshift:create to scaffold your
first shift.

See https://github.com/johndaskovsky/nightshift for details.`;

export function createInitCommand(): Command {
  return new Command("init")
    .description("Deprecated. Print plugin install instructions and exit.")
    .action(() => {
      console.log(DEPRECATION_MESSAGE);
    });
}
