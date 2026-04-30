"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    toggleZapret: (enabled, cfg) => electron_1.ipcRenderer.send('toggle-zapret', enabled, cfg),
    toggleTgProxy: (enabled, cfg) => electron_1.ipcRenderer.send('toggle-tgproxy', enabled, cfg),
    getStatus: () => electron_1.ipcRenderer.send('get-status'),
    onStatus: (cb) => electron_1.ipcRenderer.on('status', (_, p) => cb(p)),
    onLog: (cb) => electron_1.ipcRenderer.on('log', (_, p) => cb(p)),
    minimizeWindow: () => electron_1.ipcRenderer.send('window-minimize'),
    closeWindow: () => electron_1.ipcRenderer.send('window-close'),
    uninstallApp: () => electron_1.ipcRenderer.invoke('uninstall-app'),
    openUrl: (url) => electron_1.ipcRenderer.send('open-url', url),
    onTgLink: (cb) => electron_1.ipcRenderer.on('tg-link', (_, url) => cb(url)),
    updateAppSettings: (settings) => electron_1.ipcRenderer.send('update-app-settings', settings),
    hostsGet: () => electron_1.ipcRenderer.invoke('hosts-get'),
    hostsApply: (entries) => electron_1.ipcRenderer.invoke('hosts-apply', entries),
    hostsRestore: () => electron_1.ipcRenderer.invoke('hosts-restore'),
    hostsResolve: (domain) => electron_1.ipcRenderer.invoke('hosts-resolve', domain),
    listGet: () => electron_1.ipcRenderer.invoke('list-get'),
    listApply: (content) => electron_1.ipcRenderer.invoke('list-apply', content),
    strategyScanStart: (domain) => electron_1.ipcRenderer.invoke('strategy-scan-start', domain),
    strategyScanAbort: () => electron_1.ipcRenderer.invoke('strategy-scan-abort'),
    onScanProgress: (cb) => electron_1.ipcRenderer.on('scan-progress', (_, p) => cb(p)),
    dnsLeakTest: () => electron_1.ipcRenderer.invoke('dns-leak-test'),
    statusPing: () => electron_1.ipcRenderer.invoke('status-ping'),
    checkUpdate: () => electron_1.ipcRenderer.send('check-update'),
    onUpdateStatus: (cb) => electron_1.ipcRenderer.on('update-status', (_, s) => cb(s)),
});
