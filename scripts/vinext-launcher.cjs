const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const command = process.argv[2] || "dev";
const bundledNode = process.env.USERPROFILE
  ? join(
      process.env.USERPROFILE,
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "node",
      "bin",
      "node.exe",
    )
  : "";

const nodeExecutable = bundledNode && existsSync(bundledNode)
  ? bundledNode
  : process.execPath;

const majorVersion = Number(
  spawnSync(nodeExecutable, ["-p", "process.versions.node"], {
    encoding: "utf8",
  }).stdout.trim().split(".")[0],
);

if (majorVersion < 22) {
  console.error(
    `The photobooth requires Node.js 22.13 or newer (currently ${process.version}).`,
  );
  console.error("Install a current Node.js release, then reopen your terminal.");
  process.exit(1);
}

const vinextCli = join(process.cwd(), "node_modules", "vinext", "dist", "cli.js");
const result = spawnSync(nodeExecutable, [vinextCli, command], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
