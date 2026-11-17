import { join } from "node:path";
import { run, root, npm, flutter } from "./utils.mjs";
for (const name of ["format:check", "lint", "typecheck"])
  run(npm, ["run", name], join(root, "backend"));
run(npm, ["test", "--", "--runInBand"], join(root, "backend"));
run(npm, ["run", "test:e2e"], join(root, "backend"));
run(npm, ["run", "build"], join(root, "admin"));
run(flutter, ["gen-l10n"], join(root, "mobile"));
run(flutter, ["analyze"], join(root, "mobile"));
run(flutter, ["test"], join(root, "mobile"));
