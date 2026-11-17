import { join } from "node:path";
import { run, root, npm, flutter } from "./utils.mjs";
for (const project of ["backend", "admin"])
  run(npm, ["ci"], join(root, project));
run(flutter, ["pub", "get"], join(root, "mobile"));
run(flutter, ["gen-l10n"], join(root, "mobile"));
console.log("Зависимости готовы. npm run build, затем npm run dev.");
