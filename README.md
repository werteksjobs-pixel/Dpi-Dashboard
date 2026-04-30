# DPI Dashboard

A Windows desktop GUI wrapper for **Zapret** (WinDivert DPI bypass) and **TG WS Proxy** (MTProto Telegram proxy).

## Project Structure

```
DPI/
├── src/
│   ├── main.ts        — Electron main process (tray, IPC, child_process)
│   ├── preload.ts     — contextBridge API bridge
│   └── renderer.ts    — UI logic
├── index.html         — Single-page dashboard
├── assets/
│   ├── icon.png       — App window icon (place your own)
│   └── tray.png       — System tray icon  (place your own)
├── bin/               — Place winws.exe here
├── lists/             — Place list-general.txt here
├── proxy/             — Place tg-ws-proxy.exe here
├── package.json
└── tsconfig.json
```

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9

## Setup & Run (Dev)

```powershell
npm install
npm run dev
```

## Build Installer

```powershell
npm run dist
```

The NSIS installer will request Administrator privileges automatically
(`requestedExecutionLevel: requireAdministrator` in electron-builder config).

## Binary Placement

Before running, place the external executables in the project root:

| File | Location |
|---|---|
| `winws.exe` | `./bin/winws.exe` |
| `list-general.txt` | `./lists/list-general.txt` |
| `tg-ws-proxy.exe` | `./proxy/tg-ws-proxy.exe` |

## IPC API Reference

| Channel (send) | Direction | Description |
|---|---|---|
| `start-zapret` | Renderer → Main | Start Zapret process |
| `stop-zapret` | Renderer → Main | Stop Zapret process |
| `start-tgproxy` | Renderer → Main | Start TG Proxy process |
| `stop-tgproxy` | Renderer → Main | Stop TG Proxy process |
| `get-status` | Renderer → Main | Request current status |
| `status` | Main → Renderer | Status update `{ id, running }` |
| `log` | Main → Renderer | Log line `{ id, data }` |
