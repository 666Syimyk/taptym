import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { root } from "./utils.mjs";

const apiPort = Number(process.env.PORT || 3001);
const children = [];
let stopping = false;
async function available(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () =>
      reject(
        new Error(
          `Порт ${port} занят. Остановите предыдущий запуск или выберите другой PORT.`,
        ),
      ),
    );
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}
function start(script, args, cwd, env = {}) {
  const child = spawn(process.execPath, [script, ...args], {
    cwd,
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, ...env },
  });
  children.push(child);
  child.once("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  child.once("exit", (code) => {
    if (!stopping) stop(code || 0);
  });
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
process.once("SIGINT", () => stop());
process.once("SIGTERM", () => stop());
try {
  await available(apiPort);
  await available(5173);
  if (!existsSync(join(root, "backend", "dist", "main.js")))
    throw new Error("Сначала выполните npm run build.");
  start("dist/main.js", [], join(root, "backend"), {
    PORT: String(apiPort),
    PUBLIC_BASE_URL:
      process.env.PUBLIC_BASE_URL || `http://localhost:${apiPort}`,
    CORS_ORIGINS:
      process.env.CORS_ORIGINS ||
      "http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173,http://127.0.0.1:8080",
  });
  start("node_modules/vite/bin/vite.js", [], join(root, "admin"), {
    TABYLDY_API_PROXY: `http://127.0.0.1:${apiPort}`,
  });
  if (existsSync(join(root, "mobile", "build", "web", "index.html"))) {
    await available(8080);
    start(join(root, "scripts", "serve-web.mjs"), [], root);
  }
  console.log(
    `\nТабылды: приложение http://localhost:8080 · панель http://localhost:5173 · API http://localhost:${apiPort}/docs\n`,
  );
} catch (error) {
  console.error(error.message);
  stop(1);
}
