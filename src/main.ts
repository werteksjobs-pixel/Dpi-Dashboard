import { app, BrowserWindow, ipcMain, nativeImage, Tray, Menu, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, spawn, execSync } from 'child_process';
import * as net from 'net';
import * as crypto from 'crypto';
import * as dns from 'dns';
import { promisify } from 'util';
import { autoUpdater } from 'electron-updater';

const dnsResolve4 = promisify(dns.resolve4);

// --- Single Instance Lock ---
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('Second instance detected. Focus triggered.');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
      // Дополнительно для Windows: выводим на передний план
      mainWindow.setAlwaysOnTop(true);
      setTimeout(() => mainWindow?.setAlwaysOnTop(false), 200);
    }
  });
}
// ----------------------------

// --- Admin Check ---
function checkIsAdmin(): boolean {
  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const runningAsAdmin = checkIsAdmin();

// --- Task 1: Force Admin Run & Auto-Elevation ---
if (!runningAsAdmin && app.isPackaged) {
  const { exec } = require('child_process');
  // Пробуем перезапуститься через PowerShell с запросом прав (Verb RunAs)
  const elevateCmd = `powershell -Command "Start-Process -FilePath '${process.execPath}' -Verb RunAs"`;
  
  exec(elevateCmd, (err: any) => {
    if (err) {
      // Если пользователь нажал "Нет" в окне UAC
      dialog.showErrorBox(
        'Доступ запрещен',
        'Для работы сетевых функций требуются права Администратора. Приложение будет закрыто.'
      );
    }
    app.quit();
  });
}

// Принудительно чистим старый автозапуск из реестра, если он там остался
if (app.isPackaged) {
  app.setLoginItemSettings({ openAtLogin: false });
}

// --- Interfaces ---
export interface ZapretConfig {
  strategy: string;
  filterMode: 'loaded' | 'any';
  gameFilter: boolean;
  ipsetFilter: boolean;
  memoryLimit?: boolean;
  customArgs?: string;
}
export interface TgConfig {
  port: number;
  secret: string;
  fakeTls: boolean;
  dcIps?: string;
  cfEnable?: boolean;
  cfPriority?: boolean;
  cfDomain?: string;
  logVerbose?: boolean;
  bufKb?: number;
  poolSize?: number;
  logMb?: number;
}

// --- Path Resolver & Resource Extractor ---
const isPackaged = app.isPackaged;
const USER_DATA = app.getPath('userData');

// Ресурсы будут жить в AppData, чтобы всё было "в одном EXE"
function resolveExternalPath(...parts: string[]): string {
  if (isPackaged) return path.join(USER_DATA, 'resources', ...parts);
  return path.join(app.getAppPath(), ...parts);
}

// Функция для рекурсивного копирования из ASAR в AppData
function copyFolderSync(from: string, to: string) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

function ensureResources() {
  if (!isPackaged) return;
  
  const targetBase = path.join(USER_DATA, 'resources');
  const sourceBase = app.getAppPath(); // Внутри ASAR
  
  // Копируем bin и lists
  ['bin', 'lists'].forEach(folder => {
    const src = path.join(sourceBase, folder);
    const dest = path.join(targetBase, folder);
    
    if (fs.existsSync(src)) {
      copyFolderSync(src, dest);
    }
  });
}

const WINWS_EXE       = resolveExternalPath('bin', 'winws.exe');
const TG_EXE          = resolveExternalPath('bin', 'tg_ws_proxy.exe');
const APP_CONFIG_PATH = path.join(USER_DATA, 'dpi-dashboard-settings.json');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let zapretProc: ChildProcess | null = null;
let tgProc:     ChildProcess | null = null;

let lastTrafficBytes = 0;
let totalDataProcessed = 0;

function isRunning(proc: ChildProcess | null): boolean {
  return proc !== null && proc.exitCode === null && !proc.killed;
}

function sendLog(id: 'zapret' | 'tgproxy', data: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const lines = data.toString().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  mainWindow.webContents.send('log', { id, data: lines });
}

function sendStatus(id: 'zapret' | 'tgproxy'): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const running = id === 'zapret' ? isRunning(zapretProc) : isRunning(tgProc);
  mainWindow.webContents.send('status', { id, running });
}

function attachHandlers(proc: ChildProcess, id: 'zapret' | 'tgproxy'): void {
  proc.stdout?.on('data', (d) => sendLog(id, d.toString()));
  proc.stderr?.on('data', (d) => sendLog(id, d.toString()));
  proc.on('exit', (code) => {
    sendLog(id, `[System] Service stopped (code ${code})\n`);
    if (id === 'zapret') zapretProc = null; else tgProc = null;
    sendStatus(id);
  });
}

// --- Tray ---
async function setupTray() {
  try {
    // В packaged-режиме иконка лежит в extraResources (рядом с app.asar, не внутри)
    // В dev-режиме — в папке проекта
    const iconPath = isPackaged
      ? path.join(process.resourcesPath, 'electron.ico')
      : path.join(app.getAppPath(), 'assets', 'icons', 'electron.ico');
    
    let icon;
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
    } else {
      // Fallback: попробуем найти в asar
      const fallback = path.join(app.getAppPath(), 'assets', 'icons', 'electron.ico');
      icon = fs.existsSync(fallback) ? nativeImage.createFromPath(fallback) : nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'DPI Dashboard', enabled: false },
      { type: 'separator' },
      { label: 'Открыть', click: () => { mainWindow?.show(); } },
      { label: 'Выход', click: () => { isQuitting = true; app.quit(); } }
    ]);

    tray.setToolTip('DPI Dashboard');
    tray.on('double-click', () => {
      mainWindow?.show();
    });
    tray.setContextMenu(contextMenu);
  } catch (e) {
    console.error('Tray setup failed:', e);
  }
}

function startZapret(config: ZapretConfig): void {
  if (isRunning(zapretProc)) return;

  if (!fs.existsSync(WINWS_EXE)) {
    sendLog('zapret', `[Error] winws.exe not found at: ${WINWS_EXE}\n`);
    return;
  }

  // Фильтруем аргументы, чтобы избежать дубликатов или несовместимых флагов
  const args = ['--wf-tcp=80,443'];
  
  // Удаляем --stats если он пришел из настроек, так как он вызывает ошибку в текущей версии winws
  if (config.customArgs) {
    config.customArgs = config.customArgs.replace(/--stats\b/g, '').trim();
  }

  // gameFilter=true = "Games mode" → include game UDP ports 50000-65535
  args.push(config.gameFilter ? '--wf-udp=443,50000-65535' : '--wf-udp=443');

  // Paths
  const tlsPath  = resolveExternalPath('bin', 'tls_clienthello_www_google_com.bin');
  const quicPath = resolveExternalPath('bin', 'quic_initial_www_google_com.bin');

  // Всегда используем list-general.txt как основной список хостов
  let listArg = '';
  let ipsetArg = '';
  if (config.filterMode === 'loaded') {
    const hostlistPath = resolveExternalPath('lists', 'list-general.txt');
    listArg = `--hostlist=${hostlistPath}`;
    // ipset-all.txt — дополнительный фильтр по IP, если включён чекбокс
    if (config.ipsetFilter) {
      const ipsetPath = resolveExternalPath('lists', 'ipset-all.txt');
      if (fs.existsSync(ipsetPath)) {
        ipsetArg = `--ipset=${ipsetPath}`;
      }
    }
  }

  // Block 1: QUIC UDP 443
  args.push('--filter-udp=443');
  if (listArg)  args.push(listArg);
  if (ipsetArg) args.push(ipsetArg);
  args.push('--dpi-desync=fake', '--dpi-desync-repeats=6',
            `--dpi-desync-fake-quic=${quicPath}`, '--new');

  // Block 2: Game UDP (50000-65535) — добавляем блок если включён Game Filter
  if (config.gameFilter) {
    args.push('--filter-udp=50000-65535',
              '--dpi-desync=fake', '--dpi-desync-any-protocol',
              '--dpi-desync-cutoff=d3', '--dpi-desync-repeats=6', '--new');
  }

  // Block 3: HTTP TCP 80
  args.push('--filter-tcp=80');
  if (listArg)  args.push(listArg);
  if (ipsetArg) args.push(ipsetArg);
  args.push('--dpi-desync=fake,split2', '--dpi-desync-autottl=2',
            '--dpi-desync-fooling=md5sig', '--new');

  // Block 4: HTTPS TCP 443
  args.push('--filter-tcp=443');
  if (listArg)  args.push(listArg);
  if (ipsetArg) args.push(ipsetArg);

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
    case 'fake-tls-pro':
      args.push('--dpi-desync=fake,split2', '--dpi-desync-fake-tls-mod=rnd,dupsid,sni=www.google.com', '--dpi-desync-fooling=ts', '--dpi-desync-repeats=6', `--dpi-desync-fake-tls=${tlsPath}`);
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
    const customParts = config.customArgs.trim().split(/\s+/).filter(p => p.length > 0);
    args.push(...customParts);
  }

  sendLog('zapret', `[System] Starting winws.exe...\n`);
  sendLog('zapret', `[System] Command: winws.exe ${args.join(' ')}\n`);

  try {
    zapretProc = spawn(WINWS_EXE, args, { windowsHide: true });

    // Обработка ошибки spawn (EACCES, ENOENT и т.д.)
    zapretProc.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        sendLog('zapret', `[Error] Нет прав администратора! winws.exe требует запуск от имени администратора.\n`);
        sendLog('zapret', `[Error] Запустите приложение от имени администратора (ПКМ → Запуск от администратора).\n`);
      } else {
        sendLog('zapret', `[Error] Не удалось запустить winws.exe: ${err.message}\n`);
      }
      zapretProc = null;
      sendStatus('zapret');
    });

    attachHandlers(zapretProc, 'zapret');
    sendStatus('zapret');
  } catch (err: any) {
    sendLog('zapret', `[Error] Исключение при запуске: ${err.message}\n`);
    zapretProc = null;
    sendStatus('zapret');
  }
}

function startTgProxy(config: TgConfig): void {
  if (isRunning(tgProc)) return;

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
    if (config.cfPriority) args.push('--cfproxy-priority', 'True');
    if (config.cfDomain) args.push('--cfproxy-domain', config.cfDomain);
  } else {
    args.push('--no-cfproxy');
  }

  if (config.logVerbose) args.push('-v');
  if (config.bufKb) args.push('--buf-kb', config.bufKb.toString());
  if (config.poolSize !== undefined) args.push('--pool-size', config.poolSize.toString());
  if (config.logMb) {
    args.push('--log-max-mb', config.logMb.toString());
    args.push('--log-file', path.join(app.getPath('userData'), 'tgproxy.log'));
  }

  // Build the correct tg:// link
  let tgLink: string;
  if (fakeTlsDomain) {
    const domainHex = Buffer.from(fakeTlsDomain, 'ascii').toString('hex');
    tgLink = `tg://proxy?server=127.0.0.1&port=${config.port}&secret=ee${config.secret}${domainHex}`;
  } else {
    tgLink = `tg://proxy?server=127.0.0.1&port=${config.port}&secret=dd${config.secret}`;
  }

  sendLog('tgproxy', `[System] Starting TG Proxy...\n`);
  sendLog('tgproxy', `[System] Secret: ${config.secret}\n`);
  sendLog('tgproxy', `[Link] ${tgLink}\n`);

  mainWindow?.webContents.send('tg-link', tgLink);

  tgProc = spawn(TG_EXE, args, { windowsHide: true });
  attachHandlers(tgProc, 'tgproxy');
  sendStatus('tgproxy');
}

function killPortSync(port: number): void {
  try {
    // Найти PID процесса, занимающего порт, и завершить его
    const result = require('child_process').execSync(
      `netstat -ano | findstr :${port}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    ) as string;
    const lines = result.split('\n').filter((l: string) => l.includes('LISTENING'));
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1]);
      if (pid && pid > 0) {
        try {
          require('child_process').execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        } catch {}
      }
    }
  } catch {}
}

function stopTgProxy(): void {
  if (isRunning(tgProc)) {
    tgProc!.kill('SIGKILL');
    tgProc = null;
    sendStatus('tgproxy');
  }
}

// Глобальная очистка при выходе
app.on('will-quit', () => {
  console.log('App quitting... Cleaning up processes.');
  if (isRunning(zapretProc)) zapretProc!.kill('SIGKILL');
  stopTgProxy();
});

app.whenReady().then(async () => {
  ensureResources();
  let appSettings: any = {};
  try {
    if (fs.existsSync(APP_CONFIG_PATH)) {
      appSettings = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, 'utf-8'));
    }
  } catch(e) {}

  const preloadPath = isPackaged 
    ? path.join(__dirname, 'preload.js') 
    : path.join(app.getAppPath(), 'build', 'preload.js');

  mainWindow = new BrowserWindow({
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
    const startMinimized = process.argv.includes('--minimized') || appSettings.minimized;
    // Если запущено вручную (нет флага и нет настройки) или просто всегда показываем для надежности
    if (!startMinimized) {
      mainWindow?.show();
    } else {
      console.log('App started in minimized mode (to tray).');
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadFile(path.join(app.getAppPath(), 'index.html'));

  // Предупреждение о правах
  mainWindow.webContents.on('did-finish-load', () => {
    if (runningAsAdmin) {
      sendLog('zapret', `[System] Запущено с правами администратора ✓\n`);
    } else {
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
  autoUpdater.autoDownload = false; // Task 3: Disable auto-download
  autoUpdater.checkForUpdatesAndNotify();

  ipcMain.on('check-update', () => {
    autoUpdater.checkForUpdates();
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-status', 'available', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('log', { id: 'zapret', data: `[System] Доступна новая версия: ${info.version}\n` });
    }
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-status', 'latest');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    mainWindow?.webContents.send('update-download-progress', percent);
    if (mainWindow) {
      mainWindow.webContents.send('log', { 
        id: 'zapret', 
        data: `[System] Скачивание: ${percent}% (${Math.round(progressObj.transferred / 1024 / 1024)} МБ из ${Math.round(progressObj.total / 1024 / 1024)} МБ)\n` 
      });
    }
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-status', 'downloaded');
    if (mainWindow) {
      mainWindow.webContents.send('log', { id: 'zapret', data: '[System] Обновление загружено. Перезапуск для установки...\n' });
    }
    // Ждем секунду и устанавливаем
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 1500);
  });

  autoUpdater.on('error', (err: any) => {
    mainWindow?.webContents.send('update-status', 'error');
    console.error('Update error:', err);
  });

  // Создаём иконку в трее
  await setupTray();

  ipcMain.on('toggle-zapret', (_, enabled, cfg) => {
    console.log('IPC: toggle-zapret', enabled);
    if (enabled) {
      startZapret(cfg);
    } else {
      if (isRunning(zapretProc)) zapretProc!.kill('SIGKILL');
    }
    // Сохраняем состояние
    updatePersistedState({ zapretEnabled: enabled, zapretConfig: cfg });
  });

  ipcMain.on('toggle-tgproxy', (_, enabled, cfg) => {
    console.log('IPC: toggle-tgproxy', enabled);
    if (enabled) {
      startTgProxy(cfg);
    } else {
      stopTgProxy();
    }
    // Сохраняем состояние
    updatePersistedState({ tgEnabled: enabled, tgConfig: cfg });
  });

  function updatePersistedState(partial: any) {
    try {
      let current: any = {};
      if (fs.existsSync(APP_CONFIG_PATH)) {
        current = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, 'utf8'));
      }
      const updated = { ...current, ...partial };
      fs.writeFileSync(APP_CONFIG_PATH, JSON.stringify(updated));
    } catch(e) {
      console.error('Failed to update persisted state:', e);
    }
  }

  // Функция восстановления сессии
  function restoreSession() {
    try {
      if (!fs.existsSync(APP_CONFIG_PATH)) return;
      const settings = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, 'utf8'));
      
      if (settings.zapretEnabled && settings.zapretConfig) {
        console.log('Restoring Zapret session...');
        startZapret(settings.zapretConfig);
      }
      if (settings.tgEnabled && settings.tgConfig) {
        console.log('Restoring TG Proxy session...');
        startTgProxy(settings.tgConfig);
      }
    } catch(e) {
      console.error('Failed to restore session:', e);
    }
  }

  // Запускаем восстановление через небольшую паузу после старта
  setTimeout(restoreSession, 1000);

  ipcMain.on('get-status', () => { sendStatus('zapret'); sendStatus('tgproxy'); });

  ipcMain.on('window-minimize', () => { mainWindow?.minimize(); });
  ipcMain.on('window-close', () => { mainWindow?.hide(); }); // Свернуть в трей
  ipcMain.on('open-url', (_, url: string) => { shell.openExternal(url); });

  // Task 2: Version Display
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Task 3: Manual update download trigger
  ipcMain.on('download-update', () => {
    autoUpdater.downloadUpdate();
  });
  ipcMain.on('update-app-settings', (_, settings) => {
    try {
      fs.writeFileSync(APP_CONFIG_PATH, JSON.stringify(settings));
      
      const taskName = 'DPIDashboardAutostart';
      const appPath = process.execPath;
      
      // Сначала всегда удаляем старый метод из реестра, если он там был
      app.setLoginItemSettings({ openAtLogin: false });

      if (settings.autostart) {
        // Создаем задачу в планировщике с наивысшими правами
        const createCmd = `schtasks /create /tn "${taskName}" /tr "\\"${appPath}\\" --minimized" /sc onlogon /rl highest /f`;
        const { exec } = require('child_process');
        exec(createCmd, (err: any) => {
          if (err) console.error('Failed to create autostart task:', err);
          else console.log('Autostart task created successfully with high privileges.');
        });
      } else {
        // Удаляем задачу
        const deleteCmd = `schtasks /delete /tn "${taskName}" /f`;
        const { exec } = require('child_process');
        exec(deleteCmd, () => {
          console.log('Autostart task removed.');
        });
      }
    } catch(e) {
      console.error('Failed to save app settings:', e);
    }
  });

  // ── Network Stats & Watchdog ─────────────────────────────────
  let statsInterval: any = null;

  function startStatsMonitor() {
    if (statsInterval) return;
    statsInterval = setInterval(() => {
      if (isRunning(zapretProc)) {
        const { exec } = require('child_process');
        // Используем netstat -e, так как это быстрее и надежнее PowerShell для общей статистики
        exec('netstat -e', (err: any, stdout: string) => {
          if (!err && stdout) {
            // Ищем строку с байтами. Она содержит два больших числа (Received, Sent)
            // Регулярка ищет строку, начинающуюся с "Bytes" или "Байты", и берет числа
            const match = stdout.match(/(?:Bytes|Байты|Bytes)\s+(\d+)\s+(\d+)/i);
            
            if (match) {
              const currentBytes = parseInt(match[1]) + parseInt(match[2]);
              if (isNaN(currentBytes)) return;

              if (lastTrafficBytes === 0) {
                lastTrafficBytes = currentBytes;
                return;
              }

              const delta = currentBytes >= lastTrafficBytes ? (currentBytes - lastTrafficBytes) : 0;
              totalDataProcessed += delta;
              
              mainWindow?.webContents.send('on-traffic-stats', {
                bps: delta,
                total: totalDataProcessed
              });

              lastTrafficBytes = currentBytes;
            } else {
              // Если netstat не сработал (редко), пробуем запасной вариант через PS
              const psCmd = `powershell -Command "(Get-NetAdapterStatistics -ErrorAction SilentlyContinue | Measure-Object -Property ReceivedBytes,SentBytes -Sum | Measure-Object -Property Sum -Sum).Sum"`;
              exec(psCmd, (err2: any, stdout2: string) => {
                if (!err2 && stdout2) {
                  const cb = parseInt(stdout2.trim());
                  if (!isNaN(cb)) {
                    if (lastTrafficBytes === 0) { lastTrafficBytes = cb; return; }
                    const d = cb >= lastTrafficBytes ? (cb - lastTrafficBytes) : 0;
                    totalDataProcessed += d;
                    mainWindow?.webContents.send('on-traffic-stats', { bps: d, total: totalDataProcessed });
                    lastTrafficBytes = cb;
                  }
                }
              });
            }
          }
        });
      } else {
        if (lastTrafficBytes !== 0) {
          lastTrafficBytes = 0;
          mainWindow?.webContents.send('on-traffic-stats', { bps: 0, total: totalDataProcessed });
        }
      }
    }, 1000);
  }
  startStatsMonitor();

  // Watchdog: Проверка связи раз в 30 сек
  let lastWatchdogStatus: boolean | null = null;
  const runWatchdog = async () => {
    if (!isRunning(zapretProc)) return;
    const isOk = await probeTcpHost('www.youtube.com', 3000);
    if (isOk !== lastWatchdogStatus) {
      mainWindow?.webContents.send('on-status-event', {
        ok: isOk,
        time: new Date().toLocaleTimeString(),
        msg: isOk ? 'statusConnected' : 'statusDisconnected'
      });
      lastWatchdogStatus = isOk;
    }
  };
  setInterval(runWatchdog, 30000);
  setTimeout(runWatchdog, 2000);

  // IP Info с перебором сервисов для надежности
  ipcMain.handle('get-ip-info', async () => {
    const https = require('https');
    const fetchIP = (url: string) => new Promise((resolve) => {
      const req = https.get(url, { timeout: 5000 }, (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            // Унифицируем формат
            resolve({
              ip: json.ip || json.query,
              isp: json.isp || json.org || json.asn_org,
              city: json.city,
              country: json.country_name || json.country
            });
          } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });

    const services = [
      'https://ipapi.co/json/',
      'http://ip-api.com/json/',
      'https://ipwho.is/',
      'https://ipinfo.io/json',
      'https://ifconfig.me/all.json',
      'https://api.ipify.org?format=json'
    ];

    for (const url of services) {
      const res: any = await fetchIP(url);
      if (res && res.ip) return { ok: true, data: res };
    }
    return { ok: false };
  });



  // ── Zapret List Manager ────────────────────────────────────
  const LIST_PATH = resolveExternalPath('lists', 'list-general.txt');
  ipcMain.handle('list-get', async () => {
    try {
      if (!fs.existsSync(LIST_PATH)) return '';
      return fs.readFileSync(LIST_PATH, 'utf8');
    } catch(e: any) {
      return '';
    }
  });
  ipcMain.handle('list-apply', async (_, content: string) => {
    try {
      fs.writeFileSync(LIST_PATH, content, 'utf8');
      return { ok: true };
    } catch(e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ── Hosts Redirect Manager ────────────────────────────────────
  const HOSTS_PATH = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
  const HOSTS_START = '# === DPI Dashboard START ===';
  const HOSTS_END   = '# === DPI Dashboard END ===';

  function readManagedHosts(): string[] {
    try {
      const raw = fs.readFileSync(HOSTS_PATH, 'utf-8');
      const lines = raw.split(/\r?\n/);
      const start = lines.findIndex(l => l.trim() === HOSTS_START);
      const end   = lines.findIndex(l => l.trim() === HOSTS_END);
      if (start === -1 || end === -1) return [];
      return lines.slice(start + 1, end).filter(l => l.trim() && !l.startsWith('#'));
    } catch { return []; }
  }

  function applyHostsEntries(entries: string[]): { ok: boolean; error?: string } {
    try {
      let raw = fs.readFileSync(HOSTS_PATH, 'utf-8');
      // Remove old managed block
      const start = raw.indexOf(HOSTS_START);
      const end   = raw.indexOf(HOSTS_END);
      if (start !== -1 && end !== -1) {
        raw = raw.slice(0, start).trimEnd() + '\n' + raw.slice(end + HOSTS_END.length).trimStart();
      }
      if (entries.length > 0) {
        const block = `\n${HOSTS_START}\n${entries.join('\n')}\n${HOSTS_END}\n`;
        raw = raw.trimEnd() + block;
      }
      fs.writeFileSync(HOSTS_PATH, raw, 'utf-8');
      return { ok: true };
    } catch(e: any) {
      return { ok: false, error: e.message };
    }
  }

  ipcMain.handle('hosts-get', () => readManagedHosts());

  ipcMain.handle('hosts-apply', (_, entries: string[]) => applyHostsEntries(entries));

  ipcMain.handle('hosts-restore', () => applyHostsEntries([]));

  ipcMain.handle('hosts-resolve', async (_, domain: string) => {
    try {
      const addrs = await dnsResolve4(domain);
      return { ok: true, ips: addrs };
    } catch(e: any) {
      return { ok: false, error: e.message };
    }
  });

  // ── Strategy Auto-Scanner ─────────────────────────────────────
  const STRATEGIES = ['fake-tls-pro', 'alt3', 'fake-tls', 'alt', 'alt1', 'alt2', 'alt4', 'alt5', 'alt6', 'alt7', 'alt8', 'alt9', 'alt10', 'alt11'];

  /** Читаем ВСЕ домены из list-general.txt */
  function getProbeHosts(): string[] {
    try {
      const listPath = resolveExternalPath('lists', 'list-general.txt');
      const lines = fs.readFileSync(listPath, 'utf-8')
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#'));
      return lines.length > 0 ? lines : ['discord.com', 'cloudflare.com', 'roblox.com'];
    } catch {
      return ['discord.com', 'cloudflare.com', 'roblox.com'];
    }
  }

  /** Пробинг TCP на 443 порт — то, что реально перехватывает winws */
  function probeTcpHost(host: string, timeoutMs = 2000): Promise<boolean> {
    return new Promise(resolve => {
      const tls = require('tls');
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
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
  async function probeConnectivity(customDomain?: string): Promise<number> {
    // Если задан конкретный домен — проверяем только его (результат 0 или 100%)
    if (customDomain && customDomain.trim()) {
      const ok = await probeTcpHost(customDomain.trim());
      return ok ? 100 : 0;
    }
    const hosts = getProbeHosts().slice(0, 10);
    const total = hosts.length;
    if (total === 0) return 0;

    let ok = 0;
    let done = 0;

    return new Promise<number>(resolveProbe => {
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
          if (success) ok++;
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

  function buildZapretArgs(strategy: string): string[] {
    const tlsPath  = resolveExternalPath('bin', 'tls_clienthello_www_google_com.bin');
    const quicPath = resolveExternalPath('bin', 'quic_initial_www_google_com.bin');
    const listPath = resolveExternalPath('lists', 'list-general.txt');
    const listArg  = `--hostlist=${listPath}`;
    const args = ['--wf-tcp=80,443', '--wf-udp=443',
      '--filter-udp=443', listArg, '--dpi-desync=fake', '--dpi-desync-repeats=6',
      `--dpi-desync-fake-quic=${quicPath}`, '--new',
      '--filter-tcp=80', listArg, '--dpi-desync=fake,split2', '--dpi-desync-autottl=2',
      '--dpi-desync-fooling=md5sig', '--new',
      '--filter-tcp=443', listArg,
    ];
    switch (strategy) {
      case 'alt':    args.push('--dpi-desync=fake,fakedsplit','--dpi-desync-repeats=6','--dpi-desync-fooling=ts','--dpi-desync-fakedsplit-pattern=0x00',`--dpi-desync-fake-tls=${tlsPath}`); break;
      case 'alt1':   args.push('--dpi-desync=fake,disorder2','--dpi-desync-repeats=6','--dpi-desync-fooling=md5sig',`--dpi-desync-fake-tls=${tlsPath}`); break;
      case 'alt2':   args.push('--dpi-desync=multisplit','--dpi-desync-split-seqovl=652','--dpi-desync-split-pos=2',`--dpi-desync-split-seqovl-pattern=${tlsPath}`); break;
      case 'alt3':   args.push('--dpi-desync=fake,hostfakesplit','--dpi-desync-fake-tls-mod=rnd,dupsid,sni=www.google.com','--dpi-desync-hostfakesplit-mod=host=www.google.com,altorder=1','--dpi-desync-fooling=ts'); break;
      case 'alt4':   args.push('--dpi-desync=fake,multisplit','--dpi-desync-repeats=6','--dpi-desync-fooling=badseq','--dpi-desync-badseq-increment=1000',`--dpi-desync-fake-tls=${tlsPath}`); break;
      case 'alt5':   args.push('--dpi-desync=fake,split2','--dpi-desync-split-seqovl=1','--dpi-desync-split-tls=sniext',`--dpi-desync-fake-tls=${tlsPath}`); break;
      case 'alt6':   args.push('--dpi-desync=multisplit','--dpi-desync-split-seqovl=681','--dpi-desync-split-pos=1',`--dpi-desync-split-seqovl-pattern=${tlsPath}`); break;
      case 'alt7':   args.push('--dpi-desync=fake,split','--dpi-desync-repeats=6','--dpi-desync-fooling=ts','--dpi-desync-fake-tls=0x00'); break;
      case 'alt8':   args.push('--dpi-desync=fake,syndata','--dpi-desync-repeats=6','--dpi-desync-fooling=md5sig',`--dpi-desync-fake-tls=${tlsPath}`); break;
      case 'alt9':   args.push('--dpi-desync=syndata','--dpi-desync-split-seqovl=1','--dpi-desync-split-tls=sniext'); break;
      case 'alt10':  args.push('--dpi-desync=fake,disorder','--dpi-desync-repeats=6','--dpi-desync-fooling=badseq','--dpi-desync-badseq-increment=1000',`--dpi-desync-fake-tls=${tlsPath}`); break;
      case 'fake-tls-pro': args.push('--dpi-desync=fake,split2', '--dpi-desync-fake-tls-mod=rnd,dupsid,sni=www.google.com', '--dpi-desync-fooling=ts', '--dpi-desync-repeats=6', `--dpi-desync-fake-tls=${tlsPath}`); break;
      case 'alt11':  args.push('--dpi-desync=fake,split2','--dpi-desync-repeats=12','--dpi-desync-fooling=md5sig',`--dpi-desync-fake-tls=${tlsPath}`); break;
      default:       args.push('--dpi-desync=fake,split2','--dpi-desync-repeats=6','--dpi-desync-fooling=md5sig',`--dpi-desync-fake-tls=${tlsPath}`); break;
    }
    return args;
  }

  let scanAborted = false;

  ipcMain.handle('strategy-scan-start', async (_, customDomain?: string) => {
    if (!fs.existsSync(WINWS_EXE)) return { ok: false, error: 'winws.exe not found' };
    scanAborted = false;
    const results: { strategy: string; score: number; label: string }[] = [];

    // Stop main zapret if running during scan
    const wasRunning = isRunning(zapretProc);
    if (wasRunning && zapretProc) zapretProc.kill('SIGKILL');
    await new Promise(r => setTimeout(r, 600));

    for (const strategy of STRATEGIES) {
      if (scanAborted) break;
      mainWindow?.webContents.send('scan-progress', { strategy, status: 'testing' });

      const args = buildZapretArgs(strategy);
      let proc: ReturnType<typeof spawn> | null = null;
      let spawnError: Error | null = null;
      try {
        proc = spawn(WINWS_EXE, args, { windowsHide: true });
        // Перехватываем EACCES / ENOENT — иначе это необработанное исключение крашит app
        proc.on('error', (err) => {
          spawnError = err;
          sendLog('zapret', `[Scan] Ошибка запуска winws: ${err.message}\n`);
        });
        // Wait for winws to initialize (reduced to 1200ms)
        await new Promise(r => setTimeout(r, 1200));
        if (spawnError) throw spawnError;
        const score = await probeConnectivity(customDomain); // score = 0-100 %
        const label = score >= 80 ? '✅ Отлично' : score >= 50 ? '🟡 Хорошо' : score >= 20 ? '🟠 Слабо' : '❌ Нет связи';
        results.push({ strategy, score, label });
        mainWindow?.webContents.send('scan-progress', { strategy, status: 'done', score });
      } catch (err: any) {
        const errMsg = err?.code === 'EACCES' ? '❌ Нет прав (запустите от администратора)' : '❌ Ошибка';
        results.push({ strategy, score: 0, label: errMsg });
        mainWindow?.webContents.send('scan-progress', { strategy, status: 'error', score: 0 });
      } finally {
        if (proc) { try { proc.kill('SIGKILL'); } catch {} }
        await new Promise(r => setTimeout(r, 350)); // reduced cooldown
      }
    }

    const best = [...results].sort((a, b) => b.score - a.score)[0];
    return { ok: true, results, best: best?.strategy || null };
  });

  ipcMain.handle('strategy-scan-abort', async () => { scanAborted = true; return { ok: true }; });

  // ── DNS Leak Test ─────────────────────────────────────────
  const DNS_TEST_DOMAINS = ['discord.com', 'youtube.com', 'cloudflare.com', 'roblox.com'];

  ipcMain.handle('dns-leak-test', async () => {
    const results = await Promise.all(DNS_TEST_DOMAINS.map(async (domain) => {
      let ips: string[] = [];
      let dnsOk = false;
      let tcpOk = false;
      let latencyMs: number | null = null;

      try { ips = await dnsResolve4(domain); dnsOk = true; } catch { dnsOk = false; }

      const start = Date.now();
      tcpOk = await probeTcpHost(domain, 2000);
      if (tcpOk) latencyMs = Date.now() - start;

      // status: ok = DNS + TCP work, dpi-blocked = DNS ok but TCP fails,
      //         dns-poisoned = DNS returns wrong/no IP, fully-blocked = both fail
      let status: string;
      if (dnsOk && tcpOk)    status = 'ok';
      else if (dnsOk && !tcpOk) status = 'dpi-blocked';
      else if (!dnsOk && tcpOk) status = 'dns-poisoned';
      else                    status = 'fully-blocked';

      return { domain, ips, dnsOk, tcpOk, latencyMs, status };
    }));
    return { ok: true, results };
  });

  // ── Status Monitor Ping ─────────────────────────────────────
  ipcMain.handle('status-ping', async () => {
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
  ipcMain.handle('uninstall-app', async () => {
    const choice = dialog.showMessageBoxSync(mainWindow!, {
      type: 'warning',
      buttons: ['Отмена', 'Да, удалить всё'],
      defaultId: 0,
      title: 'Подтверждение удаления',
      message: 'Вы уверены, что хотите полностью удалить приложение и все его данные?',
      detail: 'Это действие удалит настройки, логи и файлы ресурсов из AppData. Сам исполняемый файл также будет удален.'
    });

    if (choice === 1) {
      const appExe  = app.getPath('exe');
      const userData = app.getPath('userData');
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
      spawn('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden',
        '-ExecutionPolicy', 'Bypass',
        '-Command',
        `Start-Process powershell -Verb RunAs -WindowStyle Hidden -ArgumentList '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File \\"${psPath}\\"'`
      ], { detached: true, stdio: 'ignore' }).unref();

      app.quit();
    }
    return { ok: false };
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (isRunning(zapretProc)) zapretProc!.kill('SIGKILL');
  stopTgProxy();
});
