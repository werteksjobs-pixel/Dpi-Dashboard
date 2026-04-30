"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const dns = __importStar(require("dns"));
const util_1 = require("util");
const electron_updater_1 = require("electron-updater");
const dnsResolve4 = (0, util_1.promisify)(dns.resolve4);
// --- Single Instance Lock ---
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}
// ----------------------------
// --- Admin Check ---
function checkIsAdmin() {
    try {
        (0, child_process_1.execSync)('net session', { stdio: 'ignore' });
        return true;
    }
    catch {
        return false;
    }
}
const runningAsAdmin = checkIsAdmin();
// --- Path Resolver & Resource Extractor ---
const isPackaged = electron_1.app.isPackaged;
const USER_DATA = electron_1.app.getPath('userData');
// Ресурсы будут жить в AppData, чтобы всё было "в одном EXE"
function resolveExternalPath(...parts) {
    if (isPackaged)
        return path.join(USER_DATA, 'resources', ...parts);
    return path.join(electron_1.app.getAppPath(), ...parts);
}
// Функция для рекурсивного копирования из ASAR в AppData
function copyFolderSync(from, to) {
    if (!fs.existsSync(to))
        fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
        const stat = fs.lstatSync(path.join(from, element));
        if (stat.isFile()) {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
        }
        else if (stat.isDirectory()) {
            copyFolderSync(path.join(from, element), path.join(to, element));
        }
    });
}
function ensureResources() {
    if (!isPackaged)
        return;
    const targetBase = path.join(USER_DATA, 'resources');
    const sourceBase = electron_1.app.getAppPath(); // Внутри ASAR
    // Копируем bin и lists
    ['bin', 'lists'].forEach(folder => {
        const src = path.join(sourceBase, folder);
        const dest = path.join(targetBase, folder);
        if (fs.existsSync(src)) {
            copyFolderSync(src, dest);
        }
    });
}
const WINWS_EXE = resolveExternalPath('bin', 'winws.exe');
const TG_EXE = resolveExternalPath('bin', 'tg_ws_proxy.exe');
const APP_CONFIG_PATH = path.join(USER_DATA, 'dpi-dashboard-settings.json');
let mainWindow = null;
let tray = null;
let isQuitting = false;
let zapretProc = null;
let tgProc = null;
function isRunning(proc) {
    return proc !== null && proc.exitCode === null && !proc.killed;
}
function sendLog(id, data) {
    if (!mainWindow || mainWindow.isDestroyed())
        return;
    const lines = data.toString().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    mainWindow.webContents.send('log', { id, data: lines });
}
function sendStatus(id) {
    if (!mainWindow || mainWindow.isDestroyed())
        return;
    const running = id === 'zapret' ? isRunning(zapretProc) : isRunning(tgProc);
    mainWindow.webContents.send('status', { id, running });
}
function attachHandlers(proc, id) {
    proc.stdout?.on('data', (d) => sendLog(id, d.toString()));
    proc.stderr?.on('data', (d) => sendLog(id, d.toString()));
    proc.on('exit', (code) => {
        sendLog(id, `[System] Service stopped (code ${code})\n`);
        if (id === 'zapret')
            zapretProc = null;
        else
            tgProc = null;
        sendStatus(id);
    });
}
// --- Tray ---
async function setupTray() {
    try {
        const iconPath = isPackaged
            ? path.join(process.resourcesPath, 'assets', 'icons', 'electron.ico')
            : path.join(electron_1.app.getAppPath(), 'assets', 'icons', 'electron.ico');
        let icon;
        if (fs.existsSync(iconPath)) {
            icon = electron_1.nativeImage.createFromPath(iconPath);
        }
        else {
            icon = electron_1.nativeImage.createEmpty();
        }
        tray = new electron_1.Tray(icon);
        const contextMenu = electron_1.Menu.buildFromTemplate([
            { label: 'DPI Dashboard', enabled: false },
            { type: 'separator' },
            { label: 'Открыть', click: () => { mainWindow?.show(); } },
            { label: 'Выход', click: () => { isQuitting = true; electron_1.app.quit(); } }
        ]);
        tray.setToolTip('DPI Dashboard');
        tray.setContextMenu(contextMenu);
        tray.on('double-click', () => {
            mainWindow?.show();
        });
    }
    catch (e) {
        console.error('Tray setup failed:', e);
    }
}
function startZapret(config) {
    if (isRunning(zapretProc))
        return;
    if (!fs.existsSync(WINWS_EXE)) {
        sendLog('zapret', `[Error] winws.exe not found at: ${WINWS_EXE}\n`);
        return;
    }
    const args = ['--wf-tcp=80,443'];
    // gameFilter=true = "Games mode" → include game UDP ports 50000-65535
    args.push(config.gameFilter ? '--wf-udp=443,50000-65535' : '--wf-udp=443');
    // Paths
    const tlsPath = resolveExternalPath('bin', 'tls_clienthello_www_google_com.bin');
    const quicPath = resolveExternalPath('bin', 'quic_initial_www_google_com.bin');
    let listArg = '';
    if (config.filterMode === 'loaded') {
        const listPath = resolveExternalPath('lists', config.ipsetFilter ? 'ipset-all.txt' : 'list-general.txt');
        listArg = config.ipsetFilter ? `--ipset=${listPath}` : `--hostlist=${listPath}`;
    }
    // Block 1: QUIC UDP 443 — обработка YouTube QUIC трафика
    args.push('--filter-udp=443');
    if (listArg)
        args.push(listArg);
    args.push('--dpi-desync=fake', '--dpi-desync-repeats=6', `--dpi-desync-fake-quic=${quicPath}`, '--new');
    // Block 2: Game UDP (50000-65535) — добавляем блок если включён Game Filter
    if (config.gameFilter) {
        args.push('--filter-udp=50000-65535', '--dpi-desync=fake', '--dpi-desync-any-protocol', '--dpi-desync-cutoff=d3', '--dpi-desync-repeats=6', '--new');
    }
    // Block 3: HTTP TCP 80
    args.push('--filter-tcp=80');
    if (listArg)
        args.push(listArg);
    args.push('--dpi-desync=fake,split2', '--dpi-desync-autottl=2', '--dpi-desync-fooling=md5sig', '--new');
    // Block 4: HTTPS TCP 443 — основной блок со стратегиями
    args.push('--filter-tcp=443');
    if (listArg)
        args.push(listArg);
    switch (config.strategy) {
        case 'alt':
            args.push('--dpi-desync=fake,fakedsplit', '--dpi-desync-repeats=6', '--dpi-desync-fooling=ts', '--dpi-desync-fakedsplit-pattern=0x00', `--dpi-desync-fake-tls=${tlsPath}`);
            break;
        case 'alt1':
            args.push('--dpi-desync=fake,disorder2', '--dpi-desync-repeats=6', '--dpi-desync-fooling=md5sig', `--dpi-desync-fake-tls=${tlsPath}`);
            break;
        case 'alt2':
            args.push('--dpi-desync=multisplit', '--dpi-desync-split-seqovl=652', '--dpi-desync-split-pos=2', `--dpi-desync-split-seqovl-pattern=${tlsPath}`);
            break;
        case 'alt3':
            args.push('--dpi-desync=fake,hostfakesplit', '--dpi-desync-fake-tls-mod=rnd,dupsid,sni=www.google.com', '--dpi-desync-hostfakesplit-mod=host=www.google.com,altorder=1', '--dpi-desync-fooling=ts');
            break;
        case 'alt4':
            args.push('--dpi-desync=fake,multisplit', '--dpi-desync-repeats=6', '--dpi-desync-fooling=badseq', '--dpi-desync-badseq-increment=1000', `--dpi-desync-fake-tls=${tlsPath}`);
            break;
        case 'alt5':
            args.push('--dpi-desync=fake,split2', '--dpi-desync-split-seqovl=1', '--dpi-desync-split-tls=sniext', `--dpi-desync-fake-tls=${tlsPath}`);
            break;
        case 'alt6':
            args.push('--dpi-desync=multisplit', '--dpi-desync-split-seqovl=681', '--dpi-desync-split-pos=1', `--dpi-desync-split-seqovl-pattern=${tlsPath}`);
            break;
        case 'alt7':
            args.push('--dpi-desync=fake,split', '--dpi-desync-repeats=6', '--dpi-desync-fooling=ts', '--dpi-desync-fake-tls=0x00');
            break;
        case 'alt8':
            args.push('--dpi-desync=fake,syndata', '--dpi-desync-repeats=6', '--dpi-desync-fooling=md5sig', `--dpi-desync-fake-tls=${tlsPath}`);
            break;
        case 'alt9':
            args.push('--dpi-desync=syndata', '--dpi-desync-split-seqovl=1', '--dpi-desync-split-tls=sniext');
            break;
        case 'alt10':
            args.push('--dpi-desync=fake,disorder', '--dpi-desync-repeats=6', '--dpi-desync-fooling=badseq', '--dpi-desync-badseq-increment=1000', `--dpi-desync-fake-tls=${tlsPath}`);
            break;
        case 'alt11':
            args.push('--dpi-desync=fake,split2', '--dpi-desync-repeats=12', '--dpi-desync-fooling=md5sig', `--dpi-desync-fake-tls=${tlsPath}`);
            break;
        case 'fake-tls':
        default:
            args.push('--dpi-desync=fake,split2', '--dpi-desync-repeats=6', '--dpi-desync-fooling=md5sig', `--dpi-desync-fake-tls=${tlsPath}`);
            break;
    }
    if (config.memoryLimit) {
        args.push('--max-payload=1200');
    }
    // Пользовательские аргументы
    if (config.customArgs && config.customArgs.trim()) {
        const customParts = config.customArgs.trim().split(/\s+/);
        args.push(...customParts);
    }
    sendLog('zapret', `[System] Starting winws.exe...\n`);
    sendLog('zapret', `[System] Command: winws.exe ${args.join(' ')}\n`);
    try {
        zapretProc = (0, child_process_1.spawn)(WINWS_EXE, args, { windowsHide: true });
        // Обработка ошибки spawn (EACCES, ENOENT и т.д.)
        zapretProc.on('error', (err) => {
            if (err.code === 'EACCES' || err.code === 'EPERM') {
                sendLog('zapret', `[Error] Нет прав администратора! winws.exe требует запуск от имени администратора.\n`);
                sendLog('zapret', `[Error] Запустите приложение от имени администратора (ПКМ → Запуск от администратора).\n`);
            }
            else {
                sendLog('zapret', `[Error] Не удалось запустить winws.exe: ${err.message}\n`);
            }
            zapretProc = null;
            sendStatus('zapret');
        });
        attachHandlers(zapretProc, 'zapret');
        sendStatus('zapret');
    }
    catch (err) {
        sendLog('zapret', `[Error] Исключение при запуске: ${err.message}\n`);
        zapretProc = null;
        sendStatus('zapret');
    }
}
function startTgProxy(config) {
    if (isRunning(tgProc))
        return;
    // Принудительно освобождаем порт на случай, если старый процесс завис
    killPortSync(config.port);
    const args = [
        '--port', config.port.toString(),
        '--secret', config.secret,
    ];
    const fakeTlsDomain = config.fakeTls ? (config.cfDomain || 'www.google.com') : '';
    if (fakeTlsDomain) {
        args.push('--fake-tls-domain', fakeTlsDomain);
    }
    if (config.cfEnable) {
        if (config.cfPriority)
            args.push('--cfproxy-priority', 'True');
        if (config.cfDomain)
            args.push('--cfproxy-domain', config.cfDomain);
    }
    else {
        args.push('--no-cfproxy');
    }
    if (config.logVerbose)
        args.push('-v');
    if (config.bufKb)
        args.push('--buf-kb', config.bufKb.toString());
    if (config.poolSize !== undefined)
        args.push('--pool-size', config.poolSize.toString());
    if (config.logMb) {
        args.push('--log-max-mb', config.logMb.toString());
        args.push('--log-file', path.join(electron_1.app.getPath('userData'), 'tgproxy.log'));
    }
    // Build the correct tg:// link
    let tgLink;
    if (fakeTlsDomain) {
        const domainHex = Buffer.from(fakeTlsDomain, 'ascii').toString('hex');
        tgLink = `tg://proxy?server=127.0.0.1&port=${config.port}&secret=ee${config.secret}${domainHex}`;
    }
    else {
        tgLink = `tg://proxy?server=127.0.0.1&port=${config.port}&secret=dd${config.secret}`;
    }
    sendLog('tgproxy', `[System] Starting TG Proxy...\n`);
    sendLog('tgproxy', `[System] Secret: ${config.secret}\n`);
    sendLog('tgproxy', `[Link] ${tgLink}\n`);
    mainWindow?.webContents.send('tg-link', tgLink);
    tgProc = (0, child_process_1.spawn)(TG_EXE, args, { windowsHide: true });
    attachHandlers(tgProc, 'tgproxy');
    sendStatus('tgproxy');
}
function killPortSync(port) {
    try {
        // Найти PID процесса, занимающего порт, и завершить его
        const result = require('child_process').execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const lines = result.split('\n').filter((l) => l.includes('LISTENING'));
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parseInt(parts[parts.length - 1]);
            if (pid && pid > 0) {
                try {
                    require('child_process').execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
                }
                catch { }
            }
        }
    }
    catch { }
}
function stopTgProxy() {
    if (isRunning(tgProc)) {
        tgProc.kill('SIGKILL');
        tgProc = null;
        sendStatus('tgproxy');
    }
}
electron_1.app.whenReady().then(async () => {
    ensureResources();
    let appSettings = {};
    try {
        if (fs.existsSync(APP_CONFIG_PATH)) {
            appSettings = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, 'utf-8'));
        }
    }
    catch (e) { }
    const preloadPath = isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(electron_1.app.getAppPath(), 'build', 'preload.js');
    mainWindow = new electron_1.BrowserWindow({
        width: 900, height: 750,
        backgroundColor: '#020617',
        show: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false
        },
    });
    mainWindow.once('ready-to-show', () => {
        if (!isPackaged || !appSettings.minimized) {
            mainWindow?.show();
        }
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    mainWindow.loadFile(path.join(electron_1.app.getAppPath(), 'index.html'));
    // Предупреждение о правах
    mainWindow.webContents.on('did-finish-load', () => {
        if (runningAsAdmin) {
            sendLog('zapret', `[System] Запущено с правами администратора ✓\n`);
        }
        else {
            sendLog('zapret', `[Warning] Нет прав администратора! Zapret не сможет работать.\n`);
            sendLog('zapret', `[Warning] Используйте: npm run dev:admin\n`);
        }
    });
    // Перехват закрытия окна — сворачиваем в трей вместо выхода
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow?.hide();
        }
    });
    // Авто-обновления
    electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
    electron_1.ipcMain.on('check-update', () => {
        electron_updater_1.autoUpdater.checkForUpdates();
    });
    electron_updater_1.autoUpdater.on('checking-for-update', () => {
        mainWindow?.webContents.send('update-status', 'checking');
    });
    electron_updater_1.autoUpdater.on('update-available', () => {
        mainWindow?.webContents.send('update-status', 'available');
        if (mainWindow) {
            mainWindow.webContents.send('log', { id: 'zapret', data: '[System] Доступно обновление, начинается загрузка...\n' });
        }
    });
    electron_updater_1.autoUpdater.on('update-not-available', () => {
        mainWindow?.webContents.send('update-status', 'latest');
    });
    electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
        if (mainWindow) {
            mainWindow.webContents.send('log', {
                id: 'zapret',
                data: `[System] Скачивание обновления: ${Math.round(progressObj.percent)}% (${Math.round(progressObj.transferred / 1024 / 1024)} МБ из ${Math.round(progressObj.total / 1024 / 1024)} МБ)\n`
            });
        }
    });
    electron_updater_1.autoUpdater.on('update-downloaded', () => {
        mainWindow?.webContents.send('update-status', 'downloaded');
        if (mainWindow) {
            mainWindow.webContents.send('log', { id: 'zapret', data: '[System] Обновление загружено и будет установлено при перезапуске.\n' });
        }
    });
    electron_updater_1.autoUpdater.on('error', (err) => {
        mainWindow?.webContents.send('update-status', 'error');
        console.error('Update error:', err);
    });
    // Создаём иконку в трее
    await setupTray();
    electron_1.ipcMain.on('toggle-zapret', (_, enabled, cfg) => {
        console.log('IPC: toggle-zapret', enabled);
        if (enabled)
            startZapret(cfg);
        else if (isRunning(zapretProc))
            zapretProc.kill('SIGKILL');
    });
    electron_1.ipcMain.on('toggle-tgproxy', (_, enabled, cfg) => {
        console.log('IPC: toggle-tgproxy', enabled);
        if (enabled)
            startTgProxy(cfg);
        else
            stopTgProxy();
    });
    electron_1.ipcMain.on('get-status', () => { sendStatus('zapret'); sendStatus('tgproxy'); });
    electron_1.ipcMain.on('window-minimize', () => { mainWindow?.minimize(); });
    electron_1.ipcMain.on('window-close', () => { mainWindow?.hide(); }); // Свернуть в трей
    electron_1.ipcMain.on('open-url', (_, url) => { electron_1.shell.openExternal(url); });
    electron_1.ipcMain.on('update-app-settings', (_, settings) => {
        try {
            fs.writeFileSync(APP_CONFIG_PATH, JSON.stringify(settings));
            electron_1.app.setLoginItemSettings({
                openAtLogin: settings.autostart,
                path: process.execPath,
            });
        }
        catch (e) {
            console.error('Failed to save app settings:', e);
        }
    });
    // ── Zapret List Manager ────────────────────────────────────
    const LIST_PATH = resolveExternalPath('lists', 'list-general.txt');
    electron_1.ipcMain.handle('list-get', async () => {
        try {
            if (!fs.existsSync(LIST_PATH))
                return '';
            return fs.readFileSync(LIST_PATH, 'utf8');
        }
        catch (e) {
            return '';
        }
    });
    electron_1.ipcMain.handle('list-apply', async (_, content) => {
        try {
            fs.writeFileSync(LIST_PATH, content, 'utf8');
            return { ok: true };
        }
        catch (e) {
            return { ok: false, error: e.message };
        }
    });
    // ── Hosts Redirect Manager ────────────────────────────────────
    const HOSTS_PATH = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
    const HOSTS_START = '# === DPI Dashboard START ===';
    const HOSTS_END = '# === DPI Dashboard END ===';
    function readManagedHosts() {
        try {
            const raw = fs.readFileSync(HOSTS_PATH, 'utf-8');
            const lines = raw.split(/\r?\n/);
            const start = lines.findIndex(l => l.trim() === HOSTS_START);
            const end = lines.findIndex(l => l.trim() === HOSTS_END);
            if (start === -1 || end === -1)
                return [];
            return lines.slice(start + 1, end).filter(l => l.trim() && !l.startsWith('#'));
        }
        catch {
            return [];
        }
    }
    function applyHostsEntries(entries) {
        try {
            let raw = fs.readFileSync(HOSTS_PATH, 'utf-8');
            // Remove old managed block
            const start = raw.indexOf(HOSTS_START);
            const end = raw.indexOf(HOSTS_END);
            if (start !== -1 && end !== -1) {
                raw = raw.slice(0, start).trimEnd() + '\n' + raw.slice(end + HOSTS_END.length).trimStart();
            }
            if (entries.length > 0) {
                const block = `\n${HOSTS_START}\n${entries.join('\n')}\n${HOSTS_END}\n`;
                raw = raw.trimEnd() + block;
            }
            fs.writeFileSync(HOSTS_PATH, raw, 'utf-8');
            return { ok: true };
        }
        catch (e) {
            return { ok: false, error: e.message };
        }
    }
    electron_1.ipcMain.handle('hosts-get', () => readManagedHosts());
    electron_1.ipcMain.handle('hosts-apply', (_, entries) => applyHostsEntries(entries));
    electron_1.ipcMain.handle('hosts-restore', () => applyHostsEntries([]));
    electron_1.ipcMain.handle('hosts-resolve', async (_, domain) => {
        try {
            const addrs = await dnsResolve4(domain);
            return { ok: true, ips: addrs };
        }
        catch (e) {
            return { ok: false, error: e.message };
        }
    });
    // ── Strategy Auto-Scanner ─────────────────────────────────────
    const STRATEGIES = ['alt3', 'fake-tls', 'alt', 'alt1', 'alt2', 'alt4', 'alt5', 'alt6', 'alt7', 'alt8', 'alt9', 'alt10', 'alt11'];
    /** Читаем ВСЕ домены из list-general.txt */
    function getProbeHosts() {
        try {
            const listPath = resolveExternalPath('lists', 'list-general.txt');
            const lines = fs.readFileSync(listPath, 'utf-8')
                .split(/\r?\n/)
                .map(l => l.trim())
                .filter(l => l.length > 0 && !l.startsWith('#'));
            return lines.length > 0 ? lines : ['discord.com', 'cloudflare.com', 'roblox.com'];
        }
        catch {
            return ['discord.com', 'cloudflare.com', 'roblox.com'];
        }
    }
    /** Пробинг TCP на 443 порт — то, что реально перехватывает winws */
    function probeTcpHost(host, timeoutMs = 2000) {
        return new Promise(resolve => {
            const tls = require('tls');
            let done = false;
            const finish = (ok) => {
                if (done)
                    return;
                done = true;
                if (sock) {
                    sock.end();
                    sock.destroy();
                }
                resolve(ok);
            };
            const sock = tls.connect({
                host: host,
                port: 443,
                servername: host, // Передаем SNI, чтобы DPI сработал
                rejectUnauthorized: false,
                timeout: timeoutMs
            }, () => {
                finish(true);
            });
            sock.on('error', () => finish(false));
            sock.on('timeout', () => finish(false));
            // На случай если сокет зависнет в состоянии ожидания
            setTimeout(() => finish(false), timeoutMs + 100);
        });
    }
    /** Возвращает процент успешных соединений (0-100) по всем доменам списка
     * Быстрый выход: как только набрывается достаточно ответов, остальные отменяются. */
    async function probeConnectivity(customDomain) {
        // Если задан конкретный домен — проверяем только его (результат 0 или 100%)
        if (customDomain && customDomain.trim()) {
            const ok = await probeTcpHost(customDomain.trim());
            return ok ? 100 : 0;
        }
        const hosts = getProbeHosts().slice(0, 10);
        const total = hosts.length;
        if (total === 0)
            return 0;
        let ok = 0;
        let done = 0;
        return new Promise(resolveProbe => {
            let resolved = false;
            const checkEarlyExit = () => {
                // Быстрый выход: если уже видно что будет >=80% (Отлично) — сразу возвращаем
                if (!resolved && ok / total >= 0.8 && ok >= 3) {
                    resolved = true;
                    resolveProbe(Math.round((ok / total) * 100));
                }
                // Все пробы завершились
                if (!resolved && done === total) {
                    resolved = true;
                    resolveProbe(Math.round((ok / total) * 100));
                }
            };
            hosts.forEach(host => {
                probeTcpHost(host).then(success => {
                    if (success)
                        ok++;
                    done++;
                    checkEarlyExit();
                });
            });
            // Глобальный таймаут — всегда завершаемся за 2s (TCP таймаут 1500ms + запас)
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolveProbe(Math.round((ok / total) * 100));
                }
            }, 2000);
        });
    }
    function buildZapretArgs(strategy) {
        const tlsPath = resolveExternalPath('bin', 'tls_clienthello_www_google_com.bin');
        const quicPath = resolveExternalPath('bin', 'quic_initial_www_google_com.bin');
        const listPath = resolveExternalPath('lists', 'list-general.txt');
        const listArg = `--hostlist=${listPath}`;
        const args = ['--wf-tcp=80,443', '--wf-udp=443',
            '--filter-udp=443', listArg, '--dpi-desync=fake', '--dpi-desync-repeats=6',
            `--dpi-desync-fake-quic=${quicPath}`, '--new',
            '--filter-tcp=80', listArg, '--dpi-desync=fake,split2', '--dpi-desync-autottl=2',
            '--dpi-desync-fooling=md5sig', '--new',
            '--filter-tcp=443', listArg,
        ];
        switch (strategy) {
            case 'alt':
                args.push('--dpi-desync=fake,fakedsplit', '--dpi-desync-repeats=6', '--dpi-desync-fooling=ts', '--dpi-desync-fakedsplit-pattern=0x00', `--dpi-desync-fake-tls=${tlsPath}`);
                break;
            case 'alt1':
                args.push('--dpi-desync=fake,disorder2', '--dpi-desync-repeats=6', '--dpi-desync-fooling=md5sig', `--dpi-desync-fake-tls=${tlsPath}`);
                break;
            case 'alt2':
                args.push('--dpi-desync=multisplit', '--dpi-desync-split-seqovl=652', '--dpi-desync-split-pos=2', `--dpi-desync-split-seqovl-pattern=${tlsPath}`);
                break;
            case 'alt3':
                args.push('--dpi-desync=fake,hostfakesplit', '--dpi-desync-fake-tls-mod=rnd,dupsid,sni=www.google.com', '--dpi-desync-hostfakesplit-mod=host=www.google.com,altorder=1', '--dpi-desync-fooling=ts');
                break;
            case 'alt4':
                args.push('--dpi-desync=fake,multisplit', '--dpi-desync-repeats=6', '--dpi-desync-fooling=badseq', '--dpi-desync-badseq-increment=1000', `--dpi-desync-fake-tls=${tlsPath}`);
                break;
            case 'alt5':
                args.push('--dpi-desync=fake,split2', '--dpi-desync-split-seqovl=1', '--dpi-desync-split-tls=sniext', `--dpi-desync-fake-tls=${tlsPath}`);
                break;
            case 'alt6':
                args.push('--dpi-desync=multisplit', '--dpi-desync-split-seqovl=681', '--dpi-desync-split-pos=1', `--dpi-desync-split-seqovl-pattern=${tlsPath}`);
                break;
            case 'alt7':
                args.push('--dpi-desync=fake,split', '--dpi-desync-repeats=6', '--dpi-desync-fooling=ts', '--dpi-desync-fake-tls=0x00');
                break;
            case 'alt8':
                args.push('--dpi-desync=fake,syndata', '--dpi-desync-repeats=6', '--dpi-desync-fooling=md5sig', `--dpi-desync-fake-tls=${tlsPath}`);
                break;
            case 'alt9':
                args.push('--dpi-desync=syndata', '--dpi-desync-split-seqovl=1', '--dpi-desync-split-tls=sniext');
                break;
            case 'alt10':
                args.push('--dpi-desync=fake,disorder', '--dpi-desync-repeats=6', '--dpi-desync-fooling=badseq', '--dpi-desync-badseq-increment=1000', `--dpi-desync-fake-tls=${tlsPath}`);
                break;
            case 'alt11':
                args.push('--dpi-desync=fake,split2', '--dpi-desync-repeats=12', '--dpi-desync-fooling=md5sig', `--dpi-desync-fake-tls=${tlsPath}`);
                break;
            default:
                args.push('--dpi-desync=fake,split2', '--dpi-desync-repeats=6', '--dpi-desync-fooling=md5sig', `--dpi-desync-fake-tls=${tlsPath}`);
                break;
        }
        return args;
    }
    let scanAborted = false;
    electron_1.ipcMain.handle('strategy-scan-start', async (_, customDomain) => {
        if (!fs.existsSync(WINWS_EXE))
            return { ok: false, error: 'winws.exe not found' };
        scanAborted = false;
        const results = [];
        // Stop main zapret if running during scan
        const wasRunning = isRunning(zapretProc);
        if (wasRunning && zapretProc)
            zapretProc.kill('SIGKILL');
        await new Promise(r => setTimeout(r, 600));
        for (const strategy of STRATEGIES) {
            if (scanAborted)
                break;
            mainWindow?.webContents.send('scan-progress', { strategy, status: 'testing' });
            const args = buildZapretArgs(strategy);
            let proc = null;
            try {
                proc = (0, child_process_1.spawn)(WINWS_EXE, args, { windowsHide: true });
                // Wait for winws to initialize (reduced to 1200ms)
                await new Promise(r => setTimeout(r, 1200));
                const score = await probeConnectivity(customDomain); // score = 0-100 %
                const label = score >= 80 ? '✅ Отлично' : score >= 50 ? '🟡 Хорошо' : score >= 20 ? '🟠 Слабо' : '❌ Нет связи';
                results.push({ strategy, score, label });
                mainWindow?.webContents.send('scan-progress', { strategy, status: 'done', score });
            }
            catch {
                results.push({ strategy, score: 0, label: '❌ Ошибка' });
                mainWindow?.webContents.send('scan-progress', { strategy, status: 'error', score: 0 });
            }
            finally {
                if (proc) {
                    try {
                        proc.kill('SIGKILL');
                    }
                    catch { }
                }
                await new Promise(r => setTimeout(r, 350)); // reduced cooldown
            }
        }
        const best = [...results].sort((a, b) => b.score - a.score)[0];
        return { ok: true, results, best: best?.strategy || null };
    });
    electron_1.ipcMain.handle('strategy-scan-abort', async () => { scanAborted = true; return { ok: true }; });
    // ── DNS Leak Test ─────────────────────────────────────────
    const DNS_TEST_DOMAINS = ['discord.com', 'youtube.com', 'cloudflare.com', 'roblox.com'];
    electron_1.ipcMain.handle('dns-leak-test', async () => {
        const results = await Promise.all(DNS_TEST_DOMAINS.map(async (domain) => {
            let ips = [];
            let dnsOk = false;
            let tcpOk = false;
            let latencyMs = null;
            try {
                ips = await dnsResolve4(domain);
                dnsOk = true;
            }
            catch {
                dnsOk = false;
            }
            const start = Date.now();
            tcpOk = await probeTcpHost(domain, 2000);
            if (tcpOk)
                latencyMs = Date.now() - start;
            // status: ok = DNS + TCP work, dpi-blocked = DNS ok but TCP fails,
            //         dns-poisoned = DNS returns wrong/no IP, fully-blocked = both fail
            let status;
            if (dnsOk && tcpOk)
                status = 'ok';
            else if (dnsOk && !tcpOk)
                status = 'dpi-blocked';
            else if (!dnsOk && tcpOk)
                status = 'dns-poisoned';
            else
                status = 'fully-blocked';
            return { domain, ips, dnsOk, tcpOk, latencyMs, status };
        }));
        return { ok: true, results };
    });
    // ── Status Monitor Ping ─────────────────────────────────────
    electron_1.ipcMain.handle('status-ping', async () => {
        const hosts = getProbeHosts().slice(0, 4);
        const results = await Promise.all(hosts.map(async (domain) => {
            const start = Date.now();
            const ok = await probeTcpHost(domain, 2000);
            const latencyMs = ok ? Date.now() - start : null;
            return { domain, ok, latencyMs };
        }));
        return { ok: true, results };
    });
    // ── Uninstall App ──────────────────────────────────────────
    electron_1.ipcMain.handle('uninstall-app', async () => {
        const choice = electron_1.dialog.showMessageBoxSync(mainWindow, {
            type: 'warning',
            buttons: ['Отмена', 'Да, удалить всё'],
            defaultId: 0,
            title: 'Подтверждение удаления',
            message: 'Вы уверены, что хотите полностью удалить приложение и все его данные?',
            detail: 'Это действие удалит настройки, логи и файлы ресурсов из AppData. Сам исполняемый файл также будет удален.'
        });
        if (choice === 1) {
            const appExe = electron_1.app.getPath('exe');
            const userData = electron_1.app.getPath('userData');
            // Скрипт PowerShell: ждёт завершения Dashboard, удаляет данные и сам EXE
            const ps = `
Start-Sleep -Seconds 3
Remove-Item -Recurse -Force "${userData.replace(/\\/g, '\\\\')}" -ErrorAction SilentlyContinue
Remove-Item -Force "${appExe.replace(/\\/g, '\\\\')}" -ErrorAction SilentlyContinue
      `.trim();
            // Записываем ps1 рядом с AppData
            const psPath = path.join(path.dirname(userData), 'uninstall_dpi.ps1');
            fs.writeFileSync(psPath, ps, 'utf8');
            // Запускаем PowerShell с правами администратора, скрытно
            (0, child_process_1.spawn)('powershell.exe', [
                '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden',
                '-ExecutionPolicy', 'Bypass',
                '-Command',
                `Start-Process powershell -Verb RunAs -WindowStyle Hidden -ArgumentList '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File \\"${psPath}\\"'`
            ], { detached: true, stdio: 'ignore' }).unref();
            electron_1.app.quit();
        }
        return { ok: false };
    });
});
electron_1.app.on('before-quit', () => {
    isQuitting = true;
    if (isRunning(zapretProc))
        zapretProc.kill('SIGKILL');
    stopTgProxy();
});
