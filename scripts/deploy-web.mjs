// Builds the web app for hosting (it talks to the address it is opened from) and
// copies it to deploy/web, which the root Dockerfile serves. Then restores the local
// build used by START, which talks to the API on localhost:3001.
import { cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { run, root, flutter } from "./utils.mjs";
const mobile = join(root, "mobile");
const build = (api) => run(flutter, ["build", "web", "--release", `--dart-define=API_BASE_URL=${api}`], mobile);
build("same-origin");
const out = join(root, "deploy", "web");
rmSync(out, { recursive: true, force: true });
cpSync(join(mobile, "build", "web"), out, { recursive: true });
console.log("Web app for hosting is in deploy/web. Restoring the local build...");
build(process.env.API_BASE_URL || "http://localhost:3001");
