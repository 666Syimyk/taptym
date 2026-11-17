// One-click start (START.bat): installs and builds on the first run, starts
// everything and opens the app in the browser as soon as the API is ready.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { root, run, npm, flutter } from "./utils.mjs";

const APP = "http://localhost:8080";
const HEALTH = `http://127.0.0.1:${process.env.PORT || 3001}/v1/health`;

async function healthy() {
  try {
    return (await fetch(HEALTH, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
}

function openBrowser(url) {
  const [cmd, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : [process.platform === "darwin" ? "open" : "xdg-open", [url]];
  spawn(cmd, args, { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

// Newest modification time under the given files/folders (build output and deps skipped).
function newest(...paths) {
  let latest = 0;
  const walk = (p) => {
    if (!existsSync(p)) return;
    const info = statSync(p);
    if (info.isDirectory()) {
      for (const name of readdirSync(p)) {
        if (!["node_modules", "dist", "build", ".dart_tool"].includes(name)) walk(join(p, name));
      }
    } else latest = Math.max(latest, info.mtimeMs);
  };
  paths.forEach((p) => walk(join(root, p)));
  return latest;
}
const builtAt = (file) => (existsSync(join(root, file)) ? statSync(join(root, file)).mtimeMs : 0);

// A previous START of this same project still holds the ports: stop it, so the
// fresh build is what runs. Processes from other folders are never touched.
function stopPreviousRun() {
  if (process.platform !== "win32") return false;
  // dev.mjs of this folder starts the API, admin panel and web server; ending its tree stops them all.
  const script = `
    $dev = (Join-Path (Join-Path $env:TABYLDY_ROOT 'scripts') 'dev.mjs').ToLower()
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
      Where-Object { $_.CommandLine -and $_.CommandLine.ToLower().Contains($dev) } |
      ForEach-Object { taskkill /PID $_.ProcessId /T /F | Out-Null; Write-Output $_.ProcessId }`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, TABYLDY_ROOT: root.replace(/[\\/]+$/, "") },
  });
  return (result.stdout || "").trim().length > 0;
}

try {
  if (!existsSync(join(root, "backend", "node_modules"))) {
    console.log("Первый запуск: устанавливаю зависимости, это займёт несколько минут...");
    run(npm, ["run", "setup"]);
  }
  // Rebuild only what changed since the last build, so edits show up after START.
  if (newest("backend/src", "backend/package.json") > builtAt("backend/dist/main.js")) {
    console.log("Собираю сервер...");
    run(npm, ["run", "build"], join(root, "backend"));
  }
  if (newest("mobile/lib", "mobile/web", "mobile/assets", "mobile/pubspec.yaml") > builtAt("mobile/build/web/main.dart.js")) {
    console.log("Собираю приложение, это займёт 2–3 минуты...");
    run(
      flutter,
      ["build", "web", "--release", `--dart-define=API_BASE_URL=${process.env.API_BASE_URL || "http://localhost:3001"}`],
      join(root, "mobile"),
    );
  }
} catch (e) {
  console.error(`
Не удалось подготовить проект: ${e.message}`);
  process.exit(1);
}

if (stopPreviousRun()) {
  console.log("Остановил прошлый запуск, запускаю заново...");
  await new Promise((r) => setTimeout(r, 1500));
} else if (await healthy()) {
  console.log("Порт API занят другой программой. Закройте её и запустите START ещё раз.");
  process.exit(1);
}

console.log(`
  Табылды запускается...
  Приложение:      ${APP}
  Панель команды:  http://localhost:5173
  Не закрывайте это окно. Чтобы остановить — закройте его или нажмите Ctrl+C.
`);
const dev = spawn(process.execPath, [join(root, "scripts", "dev.mjs")], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
});
dev.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => dev.kill(signal));

for (let i = 0; i < 180; i++) {
  if (await healthy()) {
    openBrowser(APP);
    break;
  }
  await new Promise((r) => setTimeout(r, 1000));
}
