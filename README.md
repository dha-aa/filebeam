# FileBeam

Share files between your Mac and any phone, tablet, or computer on the same local network. Start the server, scan the QR code, and upload or download files from a clean web UI.

## Features

- Upload files from any device via drag-and-drop or file picker
- Browse and download files from the shared folder
- QR code in the terminal for quick mobile access
- Send-only or get-only modes for one-way sharing
- Automatic rename when a file with the same name already exists

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- Devices must be on the same Wi‑Fi / local network

## Installation

```bash
git clone git@github.com:dha-aa/filebeam.git
cd filebeam
npm install
```

## Usage

Start the server in the current directory:

```bash
npm start
```

Or run it directly:

```bash
node server.js
```

Share a specific folder:

```bash
node server.js ~/Downloads
node server.js -d ~/Documents
```

Use a custom port:

```bash
node server.js -p 8080
```

When the server starts, it prints a local URL and a QR code. Open the URL on another device to send or receive files.

## Shell alias

Add this to your `~/.zshrc` (or `~/.bashrc`) so you can run FileBeam from anywhere:

```bash
alias server="node /Users/dha/Code/Server/server.js"
```

Reload your shell:

```bash
source ~/.zshrc
```

Then use it like this:

```bash
server                  # share current directory on port 3000
server ~/Downloads      # share Downloads
server -p 8080          # use port 8080
server -s ~/Desktop     # send-only mode
server -g               # get-only mode
server -h               # show help
```

## Arguments

| Flag | Long form | Description |
|------|-----------|-------------|
| `-p` | `--port <number>` | Port to listen on (default: `3000`) |
| `-d` | `--dir <path>` | Directory to share (default: current working directory) |
| `-s` | `--send-only` | Upload only — hides the file browser on clients |
| `-g` | `--get-only` | Download only — disables uploads |
| `-h` | `--help` | Show help message |

You can also pass the directory as a positional argument instead of using `-d`:

```bash
node server.js ~/Pictures
```

## Examples

```bash
# Share the current folder
node server.js

# Share Downloads on port 8080
node server.js -p 8080 ~/Downloads

# Let phones upload to Desktop, but not browse files
node server.js -s ~/Desktop

# Let others download files, but not upload
node server.js -g ~/Documents
```

## How it works

1. FileBeam starts a local HTTP server bound to `0.0.0.0`.
2. Your Mac’s LAN IP and port are shown in the terminal, along with a QR code.
3. Other devices open that URL in a browser.
4. Uploads go to the selected folder (or a subfolder you navigate to in the UI).
5. Downloads are served from the shared directory tree (up to 3 levels deep).

Press `Ctrl+C` in the terminal to stop the server.

## Security notes

- FileBeam is intended for trusted local networks only.
- Do not expose it to the public internet.
- Only common file extensions are allowed for uploads.
- Path traversal is blocked — clients cannot access files outside the shared directory.

## License

MIT
