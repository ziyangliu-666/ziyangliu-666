// Render intro.html frame by frame in headless Chrome and save PNGs.
// Usage: node capture.mjs <outDir> <fps> [t1 t2 ...]
// With explicit times it captures only those frames (for checking a layout).
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [outDir = "frames", fps = "20", ...times] = process.argv.slice(2);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const W = 880, H = 385, DURATION = 25.8;

mkdirSync(outDir, { recursive: true });
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, "--hide-scrollbars",
  "--user-data-dir=/tmp/intro-capture-profile", "about:blank"], { stdio: "ignore" });

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find(x => x.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error("Chrome did not start");
}

const ws = new WebSocket(await target());
await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send("Page.enable");
await send("Page.navigate", { url: "file://" + resolve(here, "intro.html") + "?capture" });
await new Promise(r => setTimeout(r, 1500));   // let fonts and logos load

const list = times.length ? times.map(Number) : Array.from({ length: Math.round(DURATION * fps) }, (_, i) => i / fps);
for (let i = 0; i < list.length; i++) {
  await send("Runtime.evaluate", { expression: `render(${list[i]})` });
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  writeFileSync(`${outDir}/f${String(i).padStart(4, "0")}.png`, Buffer.from(shot.result.data, "base64"));
}
ws.close();
chrome.kill();
console.log(`${list.length} frames -> ${outDir}`);
