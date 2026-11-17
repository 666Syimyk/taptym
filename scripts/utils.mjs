import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
export const root = fileURLToPath(new URL("../", import.meta.url));
export const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const localFlutter = join(
  process.env.USERPROFILE || process.env.HOME || "",
  "tools",
  "flutter",
  "bin",
  "flutter.bat",
);
export const flutter =
  process.env.FLUTTER_BIN ||
  (existsSync(localFlutter)
    ? localFlutter
    : process.platform === "win32"
      ? "flutter.bat"
      : "flutter");
let flutterDrive;
function flutterDirectory(directory) {
  if (process.platform !== "win32" || !/[^\x00-\x7F]/.test(directory))
    return directory;
  if (!flutterDrive) {
    flutterDrive = ["T:", "U:", "V:", "W:", "X:", "Y:", "Z:"].find(
      (d) => !existsSync(d + "\\"),
    );
    if (!flutterDrive)
      throw new Error(
        "Flutter needs an ASCII project path. Free a drive letter or use an ASCII checkout.",
      );
    const mapped = spawnSync(
      "subst",
      [flutterDrive, root.replace(/[\\/]$/, "")],
      { windowsHide: true },
    );
    if (mapped.status !== 0)
      throw new Error(
        "Could not map the Flutter project to an ASCII drive path.",
      );
    const drive = flutterDrive;
    process.once("exit", () =>
      spawnSync("subst", [drive, "/D"], { windowsHide: true }),
    );
  }
  const path = relative(root, directory);
  if (path.startsWith(".."))
    throw new Error("Flutter directory must stay inside the project.");
  return join(flutterDrive + "\\", path);
}
export function run(command, args, directory = root) {
  const bat = process.platform === "win32" && /\.(cmd|bat)$/.test(command);
  const options = {
    cwd: command === flutter ? flutterDirectory(directory) : directory,
    stdio: "inherit",
    windowsHide: true,
  };
  let result;
  if (command === npm && process.platform === "win32") {
    const cli =
      process.env.npm_execpath ||
      join(
        dirname(process.execPath),
        "node_modules",
        "npm",
        "bin",
        "npm-cli.js",
      );
    result = spawnSync(process.execPath, [cli, ...args], options);
  } else if (bat) {
    // Batch files require cmd. Reject expansion/control syntax and quote every
    // argument rather than concatenating user-configurable values into a shell.
    if ([command, ...args].some((value) => /[\r\n"%!^<>|&]/.test(value)))
      throw new Error(
        "Unsupported shell characters in a build argument. Use a plain API base URL.",
      );
    const line = [command, ...args].map((value) => `"${value}"`).join(" ");
    result = spawnSync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", `"${line}"`],
      { ...options, windowsVerbatimArguments: true },
    );
  } else result = spawnSync(command, args, options);
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed (${result.status})`);
}
