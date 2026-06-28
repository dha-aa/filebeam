#!/usr/bin/env node

const express = require("express");
const busboy = require("busboy");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const os = require("os");
const http = require("http");
const qrcodeTerminal = require("qrcode-terminal");
const UI = require("./ui");

const DEFAULT_PORT = 3000;
const MAX_SCAN_DEPTH = 3;
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const MAX_FILES = 100;
const STREAM_HIGH_WATER_MARK = 16 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".tiff",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".rtf", ".csv", ".md", ".json",
  ".mp3", ".wav", ".ogg", ".mp4", ".m4a", ".mov", ".mkv", ".avi",
  ".zip", ".tar", ".gz", ".rar", ".7z",
]);

function printHelp() {
  console.log(`
FileBeam — Local network file sharing

Usage:
  node server.js [options] [directory]

Options:
  -p, --port <number>   Port to listen on (default: ${DEFAULT_PORT})
  -d, --dir  <path>     Directory to share (default: current working directory)
  -s, --send-only       Upload only — hide file browser on clients
  -g, --get-only        Download only — disable uploads
  -h, --help            Show this help message

Examples:
  node server.js
  node server.js ~/Downloads
  node server.js -p 8080 -d ~/Documents
  node server.js -s ~/Desktop
  node server.js -g
`);
}

function parseArgs(argv) {
  const options = {
    port: DEFAULT_PORT,
    dir: process.cwd(),
    sendOnly: false,
    getOnly: false,
    help: false,
  };

  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "-s":
      case "--send-only":
        options.sendOnly = true;
        break;
      case "-g":
      case "--get-only":
        options.getOnly = true;
        break;
      case "-p":
      case "--port": {
        const value = argv[++i];
        const port = Number(value);
        if (!value || !Number.isInteger(port) || port < 1 || port > 65535) {
          console.error(`Error: invalid port "${value ?? ""}". Use a number between 1 and 65535.`);
          process.exit(1);
        }
        options.port = port;
        break;
      }
      case "-d":
      case "--dir": {
        const value = argv[++i];
        if (!value) {
          console.error("Error: --dir requires a path argument.");
          process.exit(1);
        }
        options.dir = path.resolve(value);
        break;
      }
      default:
        if (arg.startsWith("-")) {
          console.error(`Error: unknown option "${arg}". Run with --help for usage.`);
          process.exit(1);
        }
        positional.push(arg);
    }
  }

  if (positional.length > 0) {
    options.dir = path.resolve(positional[0]);
  }

  return options;
}

function getSafePath(rootDir, relativePath) {
  if (typeof relativePath !== "string") return null;
  const resolvedTarget = path.resolve(rootDir, relativePath);
  if (resolvedTarget !== rootDir && !resolvedTarget.startsWith(rootDir + path.sep)) {
    return null;
  }
  return resolvedTarget;
}

async function scanDirectory(dirPath, relativeDir = "", depth = 0) {
  if (depth > MAX_SCAN_DEPTH) return [];

  try {
    const names = await fsPromises.readdir(dirPath);
    const tasks = names.map(async (name) => {
      if (name.startsWith(".") || name.includes("/") || name.includes("\\")) return null;

      const fullPath = path.join(dirPath, name);
      const relPath = relativeDir ? `${relativeDir}/${name}` : name;

      try {
        const stat = await fsPromises.stat(fullPath);
        if (stat.isDirectory()) {
          const children = await scanDirectory(fullPath, relPath, depth + 1);
          return { name, isDir: true, relPath, children };
        }
        if (stat.isFile()) {
          return { name, isDir: false, relPath, size: stat.size };
        }
      } catch {
        return null;
      }
      return null;
    });

    const results = (await Promise.all(tasks)).filter(Boolean);
    return results.sort((a, b) => b.isDir - a.isDir);
  } catch {
    return [];
  }
}

function getLocalIP() {
  return (
    Object.values(os.networkInterfaces())
      .flat()
      .find((iface) => iface.family === "IPv4" && !iface.internal)?.address || "localhost"
  );
}

function createApp({ rootDir, sendOnly, getOnly }) {
  const app = express();
  app.disable("x-powered-by");

  app.get("/", (_req, res) => {
    res.type("html").send(UI);
  });

  app.get("/config", (_req, res) => {
    res.json({
      sendOnly,
      getOnly,
      folderName: path.basename(rootDir) || "Root",
    });
  });

  app.get("/files", async (_req, res) => {
    if (sendOnly) return res.json([]);
    const tree = await scanDirectory(rootDir);
    res.json(tree);
  });

  app.get("/download", async (req, res) => {
    if (sendOnly) return res.status(403).send("Send-only mode is active.");

    const targetFile = req.query.file || "";
    const filePath = getSafePath(rootDir, targetFile);
    if (!filePath) return res.status(400).send("Invalid path parameter.");

    try {
      const stat = await fsPromises.stat(filePath);
      if (!stat.isFile()) return res.status(400).send("Not a file.");
    } catch {
      return res.status(404).send("File not found.");
    }

    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
    fs.createReadStream(filePath, { highWaterMark: STREAM_HIGH_WATER_MARK }).pipe(res);
  });

  app.post("/upload", async (req, res) => {
    if (getOnly) return res.status(403).json({ error: "Get-only mode is active." });

    const relPath = req.headers["x-target-dir"] || "";
    const targetFolder = getSafePath(rootDir, relPath);

    try {
      const folderStat = await fsPromises.stat(targetFolder);
      if (!folderStat.isDirectory()) throw new Error("Not a directory");
    } catch {
      return res.status(400).json({ error: "Invalid target folder location." });
    }

    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
      highWaterMark: STREAM_HIGH_WATER_MARK,
    });

    const saved = [];
    let pending = 0;
    let bbDone = false;
    let hasErrorOccurred = false;
    const activeWrites = new Set();

    const cleanupAborted = () => {
      hasErrorOccurred = true;
      for (const context of activeWrites) {
        context.ws.destroy();
        fs.unlink(context.path, () => {});
      }
      activeWrites.clear();
    };

    const finishUpload = () => {
      if (hasErrorOccurred && saved.length === 0) {
        return res.status(400).json({ error: "Upload blocked or cancelled." });
      }
      res.json({ ok: true, saved });
    };

    req.on("aborted", cleanupAborted);

    bb.on("file", async (_field, stream, info) => {
      const { filename } = info;
      if (!filename) {
        stream.resume();
        return;
      }

      let destName = path.basename(filename);
      if (!destName || destName === "." || destName === "..") {
        stream.resume();
        return;
      }

      const ext = path.extname(destName).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        hasErrorOccurred = true;
        stream.resume();
        return;
      }

      try {
        await fsPromises.access(path.join(targetFolder, destName));
        destName = `${path.basename(destName, ext)}_${Date.now()}${ext}`;
      } catch {
        // File does not exist yet — keep original name.
      }

      const dest = path.join(targetFolder, destName);
      const ws = fs.createWriteStream(dest, { mode: 0o644, highWaterMark: STREAM_HIGH_WATER_MARK });
      const writeContext = { ws, path: dest };
      activeWrites.add(writeContext);

      pending++;
      stream.on("data", (chunk) => {
        if (!ws.write(chunk)) stream.pause();
      });
      ws.on("drain", () => stream.resume());
      stream.on("end", () => ws.end());

      ws.on("finish", async () => {
        activeWrites.delete(writeContext);
        try {
          const stat = await fsPromises.stat(dest);
          saved.push({ name: destName, size: stat.size });
        } catch {
          // Ignore stat errors after successful write.
        }

        pending--;
        if (bbDone && pending === 0) finishUpload();
      });

      ws.on("error", () => {
        activeWrites.delete(writeContext);
        fs.unlink(dest, () => {});
      });
    });

    bb.on("finish", () => {
      bbDone = true;
      if (pending === 0) finishUpload();
    });

    req.pipe(bb);
  });

  return app;
}

function startServer(options) {
  const { port, dir: rootDir, sendOnly, getOnly } = options;

  if (sendOnly && getOnly) {
    console.error("Error: --send-only and --get-only cannot be used together.");
    process.exit(1);
  }

  let rootStat;
  try {
    rootStat = fs.statSync(rootDir);
  } catch {
    console.error(`Error: directory not found: ${rootDir}`);
    process.exit(1);
  }

  if (!rootStat.isDirectory()) {
    console.error(`Error: not a directory: ${rootDir}`);
    process.exit(1);
  }

  const app = createApp({ rootDir, sendOnly, getOnly });
  const localIP = getLocalIP();
  const networkUrl = `http://${localIP}:${port}`;

  const server = http
    .createServer({ maxHeaderSize: 64 * 1024 }, app)
    .listen(port, "0.0.0.0", () => {
      const mode = sendOnly ? "Send only" : getOnly ? "Get only" : "Send & get";
      console.log("\n╔══════════════════════════════════════════════╗");
      console.log("║         FileBeam — Local File Sharing        ║");
      console.log("╚══════════════════════════════════════════════╝\n");
      console.log(`  Folder : ${rootDir}`);
      console.log(`  Mode   : ${mode}`);
      console.log(`  Local  : http://localhost:${port}`);
      console.log(`  Network: ${networkUrl}\n`);
      qrcodeTerminal.generate(networkUrl, { small: true });
      console.log("\n  Press Ctrl+C to stop.\n");
    });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Error: port ${port} is already in use. Try --port with a different number.`);
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  });

  const shutdown = () => {
    console.log("\nShutting down FileBeam...");
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

startServer(options);
