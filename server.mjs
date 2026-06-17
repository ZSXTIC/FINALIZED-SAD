import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
// Config is loaded directly in the browser now

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, "utf-8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!match) {
      continue;
    }

    const key = match[1];
    let value = match[2] ?? "";
    value = value.trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function resolveBoolean(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return null;
}

loadDotEnv(join(rootDir, ".env"));

const runtimeConfig = (() => {
  const envEnable = resolveBoolean(process.env.ENABLE_SUPABASE);
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  const enableSupabase = envEnable !== null ? envEnable : true;

  return {
    enableSupabase,
    supabaseUrl,
    supabaseAnonKey
  };
})();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function resolvePath(urlPath) {
  const cleanPath = urlPath.split("?")[0].split("#")[0];
  const target = cleanPath === "/" ? "/index.html" : cleanPath;
  const absolutePath = normalize(join(rootDir, target));

  if (!absolutePath.startsWith(rootDir)) {
    return null;
  }

  return absolutePath;
}

const server = createServer((req, res) => {
  const requestedPath = resolvePath(req.url || "/");

  if ((req.url || "").split("?")[0] === "/runtime-config.js") {
    res.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Type": "text/javascript; charset=utf-8"
    });
    res.end(`export const APP_CONFIG = ${JSON.stringify(runtimeConfig, null, 2)};\n`);
    return;
  }

  if (!requestedPath || !existsSync(requestedPath) || statSync(requestedPath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const fileExtension = extname(requestedPath).toLowerCase();
  const mimeType = mimeTypes[fileExtension] || "application/octet-stream";

  res.writeHead(200, {
    "Cache-Control": "no-cache",
    "Content-Type": mimeType
  });

  createReadStream(requestedPath).pipe(res);
});

server.listen(port, () => {
  console.log(`Infinitee PrintFlow DB is available at http://localhost:${port}`);
});
