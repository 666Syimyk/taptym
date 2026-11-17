import { join } from "node:path";
import { run, root, npm, flutter } from "./utils.mjs";
run(npm, ["run", "build"], join(root, "backend"));
run(npm, ["run", "build"], join(root, "admin"));
run(
  flutter,
  [
    "build",
    "web",
    "--release",
    `--dart-define=API_BASE_URL=${process.env.API_BASE_URL || "http://localhost:3001"}`,
  ],
  join(root, "mobile"),
);
