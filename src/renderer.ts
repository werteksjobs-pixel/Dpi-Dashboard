// renderer.ts - Безопасная логика

const i18n: Record<string, Record<string, string>> = {
    ru: {
        zapretTitle: 'Zapret Bypass',
        zapretDesc: 'DPI обход блокировок',
        gamesMode: '🎮 Игры',
        ipsetMode: '📋 IPSet',
        customArgsLabel: 'Свои аргументы',
        themeTitle: 'Цветовая тема оформления',
        themeDesc: 'Выберите подходящий для вас стиль приложения.',
        themeSpace: 'Космос',
        themeDark: 'Серая',
        themeLight: 'Светлая',
        langTitle: 'Язык интерфейса',
        langDesc: 'Выберите основной язык приложения.',
        btnRun: '▶ Запустить',
        btnStop: '⏹ Остановить',
        btnSave: '✔ Сохранить',
        btnCancel: 'Отмена',
        argsEditorTitle: 'Редактор аргументов Zapret',
        argsEditorDesc: 'Введите дополнительные параметры для winws.exe. Каждый аргумент должен быть разделен пробелом или новой строкой.',
        zapretStrategyHeader: 'СТРАТЕГИЯ ОБХОДА',
        filterList: '📄 Только по списку (Оптимально)',
        filterAny: '🌐 Весь трафик (Полный обход)',
        monitorPlaceholder: '— Статус будет отображен при запуске Zapret',
        btnRefresh: 'Обновить',
        tgTitle: 'Telegram Proxy',
        tgDesc: 'MTProto WebSocket мост',
        tgConnHeader: 'ПАРАМЕТРЫ ПОДКЛЮЧЕНИЯ',
        tgPortLabel: 'Порт:',
        tgSecretLabel: 'Секрет:',
        tgSecretPlaceholder: 'Авто-генерация',
        tgFakeTls: '🔒 Fake TLS маскировка',
        logAdminOk: '[System] Запущено с правами администратора ✓',
        logAdminWarn: '[Warning] Нет прав администратора! Zapret не сможет работать.',
        tgModalTitle: 'Настройки TG Proxy',
        tgDcHeader: 'Датацентры Telegram (DC → IP)',
        tgDcDesc: 'По одному правилу на строку, формат: номер:IP',
        tgCfEnable: 'Включить CF-прокси',
        tgCfPriority: 'Приоритет',
        tgCfDomainLabel: 'Свой домен',
        tgPerfHeader: 'Логи и производительность',
        tgVerboseLabel: 'Подробное логирование (verbose)',
        tgBufLabel: 'Буфер, КБ (по умолчанию 256)',
        tgPoolLabel: 'Пул WebSocket-сессий (по умолчанию 4)',
        btnDone: 'Готово',
        zapretModalTitle: 'Настройки Zapret',
        zapretSystemHeader: 'Системные параметры',
        zapretMemTitle: 'Ограничение памяти (Payload)',
        zapretMemDesc: 'Разбивает пакеты для решения проблем с загрузкой страниц.',
        zapretListTitle: 'Свой список доменов',
        zapretListDesc: 'Управление файлом list-general.txt для обхода.',
        zapretScanTitle: '🔍 Найти лучший обход',
        zapretScanDesc: 'Автоматически перебирает все стратегии и проверяет связь.',
        zapretDnsTitle: '🧩 DNS Leak Test',
        zapretDnsDesc: 'Проверяет DNS резолюцию и TCP доступность.',
        updateTitle: 'Обновление приложения',
        btnCheckUpdate: 'Проверить наличие обновлений',
        updateChecking: '🔎 Проверка...',
        updateAvailable: '📥 Загрузка...',
        updateLatest: '✅ Последняя версия',
        updateDownloaded: '📦 Готово к установке',
        updateError: '❌ Ошибка проверки'
    },
    en: {
        zapretTitle: 'Zapret Bypass',
        zapretDesc: 'DPI Bypass Utility',
        gamesMode: '🎮 Games',
        ipsetMode: '📋 IPSet',
        customArgsLabel: 'Custom Arguments',
        themeTitle: 'Visual Theme',
        themeDesc: 'Choose the application style you prefer.',
        themeSpace: 'Space',
        themeDark: 'Gray',
        themeLight: 'Light',
        langTitle: 'Interface Language',
        langDesc: 'Choose the primary language.',
        btnRun: '▶ Run',
        btnStop: '⏹ Stop',
        btnSave: '✔ Save',
        btnCancel: 'Cancel',
        argsEditorTitle: 'Zapret Arguments Editor',
        argsEditorDesc: 'Enter additional parameters for winws.exe. Each argument should be separated by a space or a new line.',
        zapretStrategyHeader: 'BYPASS STRATEGY',
        filterList: '📄 List Only (Optimal)',
        filterAny: '🌐 All Traffic (Full Bypass)',
        monitorPlaceholder: '— Status will be shown when Zapret starts',
        btnRefresh: 'Refresh',
        tgTitle: 'Telegram Proxy',
        tgDesc: 'MTProto WebSocket bridge',
        tgConnHeader: 'CONNECTION PARAMETERS',
        tgPortLabel: 'Port:',
        tgSecretLabel: 'Secret:',
        tgSecretPlaceholder: 'Auto-generation',
        tgFakeTls: '🔒 Fake TLS Masking',
        logAdminOk: '[System] Started with administrator privileges ✓',
        logAdminWarn: '[Warning] No administrator privileges! Zapret will not work.',
        tgModalTitle: 'Telegram Proxy Settings',
        tgDcHeader: 'Telegram Datacenters (DC → IP)',
        tgDcDesc: 'One rule per line, format: number:IP',
        tgCfEnable: 'Enable CF-proxy',
        tgCfPriority: 'Priority',
        tgCfDomainLabel: 'Custom Domain',
        tgPerfHeader: 'Logs and Performance',
        tgVerboseLabel: 'Verbose Logging',
        tgBufLabel: 'Buffer, KB (default 256)',
        tgPoolLabel: 'WebSocket Session Pool (default 4)',
        btnDone: 'Done',
        zapretModalTitle: 'Zapret Settings',
        zapretSystemHeader: 'System Parameters',
        zapretMemTitle: 'Memory Limit (Payload)',
        zapretMemDesc: 'Splits packets to solve page loading issues.',
        zapretListTitle: 'Custom Domain List',
        zapretListDesc: 'Manage list-general.txt for selective bypass.',
        zapretScanTitle: '🔍 Find Best Strategy',
        zapretScanDesc: 'Automatically tests all strategies and checks connection.',
        zapretDnsTitle: '🧩 DNS Leak Test',
        zapretDnsDesc: 'Checks DNS resolution and TCP availability.',
        updateTitle: 'App Updates',
        btnCheckUpdate: 'Check for Updates',
        updateChecking: '🔎 Checking...',
        updateAvailable: '📥 Downloading...',
        updateLatest: '✅ Up to date',
        updateDownloaded: '📦 Ready to install',
        updateError: '❌ Update error'
    }
};

function updateLanguage(lang: 'ru' | 'en') {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key && i18n[lang][key]) {
            el.textContent = i18n[lang][key];
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key && i18n[lang][key]) {
            (el as HTMLInputElement).placeholder = i18n[lang][key];
        }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key && i18n[lang][key]) {
            (el as HTMLElement).title = i18n[lang][key];
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Loaded, initializing UI...');

    // Убираем сплэш-скрин
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) splash.classList.add('hidden');
    }, 2200);

    const api = (window as any).electronAPI;
    if (!api) {
        alert("CRITICAL ERROR: 'electronAPI' not found! Preload script failed to load.");
        return;
    }

    const getEl = (id: string) => {
        const el = document.getElementById(id);
        if (!el) console.warn(`Element with ID '${id}' not found!`);
        return el;
    };

    const els = {
        zapToggle: getEl('zapret-toggle'),
        tgToggle:  getEl('tg-toggle'),
        logBox:    getEl('log-box'),
        // Zapret settings
        strategy:   document.getElementById('zapret-strategy') as HTMLSelectElement,
        filterMode: document.getElementById('zapret-filter-mode') as HTMLSelectElement,
        game:       document.getElementById('game-filter') as HTMLInputElement,
        ipset:      document.getElementById('ipset-filter') as HTMLInputElement,
        zapretMemory: document.getElementById('zapret-memory-limit') as HTMLInputElement,
        
        // App Settings
        appAutostart: document.getElementById('app-autostart') as HTMLInputElement,
        appStartMin: document.getElementById('app-start-minimized') as HTMLInputElement,
        appThemeMode: document.getElementById('app-theme-mode') as HTMLSelectElement,
        tgPort:     document.getElementById('tg-port') as HTMLInputElement,
        tgSecret:   document.getElementById('tg-secret') as HTMLInputElement,
        tgFakeTls:  document.getElementById('tg-fake-tls') as HTMLInputElement,
        tgDcIps:    document.getElementById('tg-dc-ips') as HTMLTextAreaElement,
        tgCfEnable: document.getElementById('tg-cf-enable') as HTMLInputElement,
        tgCfPriority: document.getElementById('tg-cf-priority') as HTMLInputElement,
        tgCfDomain: document.getElementById('tg-cf-domain') as HTMLInputElement,
        tgLogVerbose: document.getElementById('tg-log-verbose') as HTMLInputElement,
        tgBufKb:    document.getElementById('tg-buf-kb') as HTMLInputElement,
        tgPoolSize: document.getElementById('tg-pool-size') as HTMLInputElement,
        tgLogMb:    document.getElementById('tg-log-mb') as HTMLInputElement,
        btnUninstall: document.getElementById('btn-uninstall') as HTMLButtonElement,
        zapretCustomArgs: document.getElementById('zapret-custom-args') as HTMLInputElement,
        appLang:    document.getElementById('app-lang') as HTMLSelectElement,
        argsEditBtn: document.getElementById('btn-edit-args') as HTMLButtonElement,
        argsModal:   document.getElementById('args-modal') as HTMLElement,
        argsTextarea: document.getElementById('args-editor-textarea') as HTMLTextAreaElement,
        argsSaveBtn: document.getElementById('args-modal-save') as HTMLButtonElement,
        argsCancelBtn: document.getElementById('args-modal-cancel') as HTMLButtonElement,
        argsCloseBtn: document.getElementById('args-modal-close') as HTMLButtonElement,

        // Update Modal
        updateModal:     document.getElementById('update-modal') as HTMLElement,
        updateNewVersion: document.getElementById('new-version-text') as HTMLElement,
        updateYesBtn:    document.getElementById('btn-update-yes') as HTMLButtonElement,
        updateNoBtn:     document.getElementById('btn-update-no') as HTMLButtonElement,
        updateProgressWrap: document.getElementById('update-progress-wrap') as HTMLElement,
        updateProgressBar:  document.getElementById('update-progress-bar') as HTMLElement,
        updatePercentText:  document.getElementById('update-percent-text') as HTMLElement,
        updateModalBtns:    document.getElementById('update-modal-btns') as HTMLElement,
        
        btnCheckUpdate:  document.getElementById('btn-check-update') as HTMLButtonElement,
        appVersionDisplay: document.getElementById('app-version-display') as HTMLElement,
    };

    const state = { zapret: false, tgproxy: false };

    // Функция отрисовки логов
    api.onLog((p: any) => {
        if (els.logBox) {
            const lang = els.appLang?.value as 'ru' | 'en' || 'ru';
            let text = p.data.trim();
            
            // Перевод системных сообщений
            if (text.includes('Запущено с правами администратора')) text = i18n[lang].logAdminOk;
            if (text.includes('Нет прав администратора')) text = i18n[lang].logAdminWarn;

            const div = document.createElement('div');
            div.style.padding = '2px 0';
            div.style.color = p.id === 'zapret' ? '#3b82f6' : '#10b981';
            div.textContent = `[${p.id.toUpperCase()}] ${text}`;
            els.logBox.appendChild(div);
            els.logBox.scrollTop = els.logBox.scrollHeight;
        }
    });

    // Функция обновления кнопок + запуск статус-монитора
    api.onStatus((p: any) => {
        const isZap = p.id === 'zapret';
        const btn = isZap ? els.zapToggle : els.tgToggle;
        const label = document.getElementById(`${p.id}-label`);

        if (isZap) state.zapret = p.running; else state.tgproxy = p.running;

        if (btn) {
            const lang = els.appLang?.value as 'ru' | 'en' || 'ru';
            btn.textContent = p.running ? i18n[lang].btnStop : i18n[lang].btnRun;
            (btn as HTMLButtonElement).className = `toggle-btn ${p.running ? 'btn-stop' : 'btn-start'}`;
        }
        if (label) {
            label.textContent = p.running ? 'ONLINE' : 'OFFLINE';
            if (p.running) label.classList.add('online');
            else label.classList.remove('online');
        }

        // Статус-монитор: запускаем при смене состояния Zapret
        if (isZap) {
            if (p.running) {
                runStatusPing();
                startMonitorInterval();
            } else {
                stopMonitorInterval();
                resetMonitorToIdle();
            }
        }
    });

    // Обработчик Zapret
    if (els.zapToggle) {
        els.zapToggle.onclick = () => {
            console.log('Click: Zapret');
            if (state.zapret) {
                api.toggleZapret(false);
            } else {
                api.toggleZapret(true, {
                    strategy: els.strategy?.value || 'alt3',
                    filterMode: els.filterMode?.value || 'loaded',
                    gameFilter: els.game?.checked || false,
                    ipsetFilter: els.ipset?.checked || false,
                    customArgs: els.zapretCustomArgs?.value || ''
                });
            }
        };
    }

    // Обработчик TG
    if (els.tgToggle) {
        els.tgToggle.onclick = () => {
            if (state.tgproxy) {
                api.toggleTgProxy(false);
            } else {
                api.toggleTgProxy(true, {
                    port: parseInt(els.tgPort?.value || '1443'),
                    secret: els.tgSecret?.value || '758da3210b2dafeaaf1902413411f920',
                    fakeTls: els.tgFakeTls?.checked || false,
                    dcIps: els.tgDcIps?.value || '',
                    cfEnable: els.tgCfEnable?.checked || false,
                    cfPriority: els.tgCfPriority?.checked || false,
                    cfDomain: els.tgCfDomain?.value || '',
                    logVerbose: els.tgLogVerbose?.checked || false,
                    bufKb: parseInt(els.tgBufKb?.value || '256'),
                    poolSize: parseInt(els.tgPoolSize?.value || '4'),
                    logMb: parseInt(els.tgLogMb?.value || '5'),
                });
            }
        };
    }

    // Кнопки управления окном
    const btnMinimize = document.getElementById('btn-minimize');
    const btnClose = document.getElementById('btn-close');
    if (btnMinimize) btnMinimize.onclick = () => api.minimizeWindow();
    if (btnClose) btnClose.onclick = () => api.closeWindow();
    if (els.btnUninstall) {
        els.btnUninstall.onclick = () => api.uninstallApp();
    }
    // Автоматическое открытие ссылки в Telegram при первом запуске
    api.onTgLink((url: string) => {
        console.log('TG Proxy link:', url);
        
        // Проверяем, открывали ли мы эту ссылку раньше
        const alreadyOpened = localStorage.getItem('has_opened_tg_link');
        
        if (!alreadyOpened) {
            // Даём прокси 1.5 сек на запуск, потом открываем TG
            setTimeout(() => {
                api.openUrl(url);
                localStorage.setItem('has_opened_tg_link', 'true');
            }, 1500);
        } else {
            console.log('TG link already offered before, skipping auto-open.');
        }
    });

    api.getStatus();

    // Task 2: Dynamic Version Display
    async function initVersion() {
        if (els.appVersionDisplay) {
            const version = await api.getAppVersion();
            els.appVersionDisplay.textContent = `v${version}`;
        }
    }
    initVersion();

    // Task 3: Controlled Manual Update
    if (els.btnCheckUpdate) {
        els.btnCheckUpdate.onclick = () => {
            const lang = els.appLang?.value as 'ru' | 'en' || 'ru';
            const desc = document.getElementById('update-desc');
            if (desc) desc.textContent = i18n[lang].updateChecking;
            api.checkUpdate();
        };
    }

    api.onUpdateStatus((status: string, version?: string) => {
        console.log('Update status:', status, version);
        const lang = els.appLang?.value as 'ru' | 'en' || 'ru';
        const desc = document.getElementById('update-desc');
        
        if (status === 'available') {
            if (els.updateModal && version) {
                els.updateNewVersion!.textContent = version;
                els.updateModal.classList.add('open');
                // Сбрасываем прогресс-бар если был
                els.updateProgressWrap!.style.display = 'none';
                els.updateModalBtns!.style.display = 'flex';
            }
            if (desc) desc.textContent = i18n[lang].updateAvailable;
        } else if (status === 'latest') {
            if (desc) desc.textContent = i18n[lang].updateLatest;
        } else if (status === 'downloaded') {
            if (desc) desc.textContent = i18n[lang].updateDownloaded;
        } else if (status === 'error') {
            if (desc) desc.textContent = i18n[lang].updateError;
        }
    });

    api.onUpdateDownloadProgress((percent: number) => {
        if (els.updateProgressWrap) {
            els.updateProgressWrap.style.display = 'block';
            els.updateProgressBar!.style.width = `${percent}%`;
            els.updatePercentText!.style.display = 'block';
            els.updatePercentText!.textContent = `${percent}%`;
            els.updateModalBtns!.style.display = 'none'; // Скрываем кнопки во время загрузки
        }
    });

    if (els.updateYesBtn) {
        els.updateYesBtn.onclick = () => {
            api.downloadUpdate();
        };
    }
    if (els.updateNoBtn) {
        els.updateNoBtn.onclick = () => {
            els.updateModal?.classList.remove('open');
        };
    }

    // Theme toggle
    const updateTheme = () => {
        document.body.classList.remove('theme-light', 'theme-gray');
        
        const mode = els.appThemeMode?.value || 'space';
        if (mode === 'light') {
            document.body.classList.add('theme-light');
        } else if (mode === 'dark') {
            document.body.classList.add('theme-gray');
        }
        // 'space' is the default root styles with glassmorphism
    };

    // State Persistence using localStorage
    const saveState = () => {
        const data: any = {};
        for (const [k, v] of Object.entries(els)) {
            if (!v) continue;
            if (v instanceof HTMLInputElement) {
                if (v.type === 'checkbox') data[k] = v.checked;
                else data[k] = v.value;
            } else if (v instanceof HTMLSelectElement || v instanceof HTMLTextAreaElement) {
                data[k] = v.value;
            }
        }
        localStorage.setItem('dpi-dashboard-state', JSON.stringify(data));
        
        // Notify main process of app settings
        if (api.updateAppSettings) {
            api.updateAppSettings({
                autostart: els.appAutostart?.checked || false,
                minimized: els.appStartMin?.checked || false
            });
        }
        updateTheme();
        updateLanguage((els.appLang?.value as any) || 'ru');
    };

    const loadState = () => {
        try {
            const json = localStorage.getItem('dpi-dashboard-state');
            if (json) {
                const data = JSON.parse(json);
                for (const [k, val] of Object.entries(data)) {
                    const el = (els as any)[k];
                    if (!el) continue;
                    if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = val as boolean;
                    else el.value = val as string;
                }
            }
        } catch(e) {}
        updateTheme();
        updateLanguage((els.appLang?.value as any) || 'ru');
    };

    // Attach save trigger to inputs
    for (const v of Object.values(els)) {
        if (v && (v instanceof HTMLInputElement || v instanceof HTMLSelectElement || v instanceof HTMLTextAreaElement)) {
            v.addEventListener('change', saveState);
        }
    }

    loadState(); // Initial load

    // Script to hide/show empty message
    const msg = document.getElementById('log-empty');
    if (els.logBox && msg) {
        const observer = new MutationObserver(() => {
            msg.style.display = els.logBox!.children.length > 0 ? 'none' : 'block';
        });
        observer.observe(els.logBox, { childList: true });
    }

    // Generic Modal setup
    const setupModal = (id: string, btnId: string, saveId: string) => {
        const m = document.getElementById(id);
        const btn = document.getElementById(btnId);
        const cls = document.getElementById(`${id}-close`);
        const save = document.getElementById(saveId);
        if (m) {
            if (btn) btn.addEventListener('click', () => m.classList.add('open'));
            if (cls) cls.addEventListener('click', () => m.classList.remove('open'));
            if (save) save.addEventListener('click', () => { m.classList.remove('open'); saveState(); });
            m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
        }
    };

    setupModal('tg-modal', 'tg-settings-btn', 'tg-modal-save');
    setupModal('zapret-modal', 'zapret-settings-btn', 'zapret-modal-save');
    setupModal('app-modal', 'btn-app-settings', 'app-modal-save');

    // List Editor Modal
    const listModal = document.getElementById('list-modal');
    const btnEditList = document.getElementById('btn-edit-list');
    const listTextarea = document.getElementById('list-editor-textarea') as HTMLTextAreaElement;
    const listStatus = document.getElementById('list-status');
    
    if (listModal && btnEditList) {
        btnEditList.addEventListener('click', async () => {
            try {
                const content = await api.listGet();
                listTextarea.value = content || '';
                if (listStatus) listStatus.style.display = 'none';
                listModal.classList.add('open');
            } catch (e) {
                console.error(e);
            }
        });
        
        document.getElementById('list-modal-close')?.addEventListener('click', () => listModal.classList.remove('open'));
        document.getElementById('list-modal-cancel')?.addEventListener('click', () => listModal.classList.remove('open'));
        listModal.addEventListener('click', e => { if (e.target === listModal) listModal.classList.remove('open'); });

        document.getElementById('list-modal-save')?.addEventListener('click', async () => {
            const res = await api.listApply(listTextarea.value);
            if (res.ok) {
                listModal.classList.remove('open');
            } else {
                if (listStatus) {
                    listStatus.textContent = 'Ошибка сохранения: ' + res.error;
                    listStatus.className = 'hosts-status err';
                    listStatus.style.display = 'block';
                }
            }
        });
    }

    // Args Editor Modal Logic
    if (els.argsEditBtn && els.argsModal) {
        els.argsEditBtn.onclick = () => {
            if (els.argsTextarea && els.zapretCustomArgs) {
                // Превращаем строку в столбик для удобства
                els.argsTextarea.value = els.zapretCustomArgs.value.trim().split(/\s+/).join('\n');
            }
            els.argsModal.classList.add('open');
        };
        
        els.argsCancelBtn.onclick = () => els.argsModal.classList.remove('open');
        els.argsCloseBtn.onclick = () => els.argsModal.classList.remove('open');
        els.argsSaveBtn.onclick = () => {
            if (els.argsTextarea && els.zapretCustomArgs) {
                // Превращаем обратно в строку
                els.zapretCustomArgs.value = els.argsTextarea.value.trim().split(/\n/).map(s => s.trim()).filter(s => s).join(' ');
                saveState();
            }
            els.argsModal.classList.remove('open');
        };
        
        els.argsModal.onclick = (e) => { if (e.target === els.argsModal) els.argsModal.classList.remove('open'); };
    }

    // ── Hosts Redirect Manager ────────────────────────────────────
    interface HostEntry { ip: string; domain: string; }
    interface HostCategory { id: string; name: string; entries: HostEntry[]; enabled: boolean; }

    let hostsCategories: HostCategory[] = [];
    const hostsStatusEl = document.getElementById('hosts-status') as HTMLElement;

    function showHostsStatus(msg: string, ok: boolean) {
        hostsStatusEl.textContent = msg;
        hostsStatusEl.className = `hosts-status ${ok ? 'ok' : 'err'}`;
        setTimeout(() => { hostsStatusEl.className = 'hosts-status'; }, 4000);
    }

    function renderHostsTable() {
        const tbody = document.getElementById('hosts-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        hostsCategories.forEach((cat, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><label class="switch" style="margin-left:0"><input type="checkbox" class="hosts-chk" data-idx="${idx}" ${cat.enabled ? 'checked' : ''}><span class="slider"></span></label></td>
              <td><div class="host-service-name">${cat.name}</div></td>
              <td><div class="host-domain">${cat.entries.length} записей</div></td>
            `;
            tbody.appendChild(tr);
        });

        // bind events
        tbody.querySelectorAll<HTMLInputElement>('.hosts-chk').forEach(chk => {
            chk.addEventListener('change', () => { hostsCategories[+chk.dataset.idx!].enabled = chk.checked; });
        });
    }

    // Open hosts modal and load current state
    const hostsModal = document.getElementById('hosts-modal');
    const btnHosts = document.getElementById('btn-hosts');
    if (hostsModal && btnHosts) {
        btnHosts.addEventListener('click', async () => {
            // Load the categories if not loaded
            if (hostsCategories.length === 0) {
                try {
                    const res = await fetch('assets/hosts-data.json');
                    hostsCategories = await res.json();
                    hostsCategories.forEach(c => c.enabled = false);
                } catch(e) {
                    console.error('Failed to load hosts-data.json', e);
                    showHostsStatus('✗ Не удалось загрузить базу доменов', false);
                    return;
                }
            }

            // Load existing managed entries from system
            const existing: string[] = await api.hostsGet();
            const existingSet = new Set(existing.map(l => l.trim()));
            
            // Determine which categories are fully enabled
            hostsCategories.forEach(cat => {
                // If the user has at least some entries of this category in their hosts file, we check it
                const hasMatch = cat.entries.some(e => existingSet.has(`${e.ip} ${e.domain}`));
                cat.enabled = hasMatch;
            });
            
            renderHostsTable();
            hostsModal.classList.add('open');
        });
        document.getElementById('hosts-modal-close')?.addEventListener('click', () => hostsModal.classList.remove('open'));
        hostsModal.addEventListener('click', e => { if (e.target === hostsModal) hostsModal.classList.remove('open'); });
    }

    // Apply button
    document.getElementById('hosts-apply-btn')?.addEventListener('click', async () => {
        const flatEntries: string[] = [];
        hostsCategories.forEach(cat => {
            if (cat.enabled) {
                cat.entries.forEach(e => flatEntries.push(`${e.ip} ${e.domain}`));
            }
        });
        
        const res = await api.hostsApply(flatEntries);
        if (res.ok) {
            showHostsStatus(`✔ Применено ${flatEntries.length} запис(ей).`, true);
            document.getElementById('restart-modal')?.classList.add('open');
        } else {
            showHostsStatus(`✗ Ошибка: ${res.error}`, false);
        }
    });

    // Restore button
    document.getElementById('hosts-restore-btn')?.addEventListener('click', async () => {
        const res = await api.hostsRestore();
        if (res.ok) {
            hostsCategories.forEach(c => c.enabled = false);
            renderHostsTable();
            showHostsStatus('✔ Все записи удалены из hosts файла.', true);
            document.getElementById('restart-modal')?.classList.add('open');
        } else {
            showHostsStatus(`✗ Ошибка: ${res.error}`, false);
        }
    });

    // Close restart modal
    document.getElementById('restart-modal-ok')?.addEventListener('click', () => {
        document.getElementById('restart-modal')?.classList.remove('open');
    });

    // ── Strategy Scanner Modal ────────────────────────────────────
    const scanModal = document.getElementById('scan-modal');
    const btnScanStrategy = document.getElementById('btn-scan-strategy');
    const scanStartBtn = document.getElementById('scan-start-btn');
    const scanAbortBtn = document.getElementById('scan-abort-btn');
    const scanList = document.getElementById('scan-list');
    const scanProgressLabel = document.getElementById('scan-progress-label');
    const scanSummary = document.getElementById('scan-summary');
    const scanSummaryText = document.getElementById('scan-summary-text');
    const scanApplyBtn = document.getElementById('scan-apply-btn');
    const scanDomainInput = document.getElementById('scan-domain-input') as HTMLInputElement;
    const scanDomainHint = document.getElementById('scan-domain-hint');

    let bestFoundStrategy = '';

    // Упдатем подсказку под полем ввода
    const updateHint = () => {
        const val = scanDomainInput?.value.trim();
        if (scanDomainHint) {
            scanDomainHint.innerHTML = val
                ? `Будет проверен TCP 443 на: <b style="color:var(--text-primary);font-family:monospace">${val}</b>`
                : 'Будет проверен весь <b>list-general.txt</b> (все домены параллельно)';
        }
        // Синх активный чип
        document.querySelectorAll('.scan-chip').forEach(chip => {
            const c = chip as HTMLElement;
            c.classList.toggle('active', c.dataset.domain === val || (!val && c.dataset.domain === ''));
        });
    };

    if (scanDomainInput) {
        scanDomainInput.addEventListener('input', updateHint);
    }

    // Клик по чипам
    document.querySelectorAll('.scan-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const domain = (chip as HTMLElement).dataset.domain || '';
            if (scanDomainInput) scanDomainInput.value = domain;
            updateHint();
        });
    });
    updateHint(); // initial state

    if (scanModal && btnScanStrategy) {
        btnScanStrategy.addEventListener('click', () => {
            if (scanList) scanList.innerHTML = '';
            if (scanProgressLabel) scanProgressLabel.textContent = 'Нажмите «Начать сканирование»';
            if (scanSummary) scanSummary.classList.remove('visible');
            if (scanStartBtn) {
                scanStartBtn.style.display = 'inline-flex';
                scanStartBtn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:4px;"><polygon points="5 3 19 12 5 21 5 3"/></svg> Начать сканирование';
            }
            if (scanAbortBtn) scanAbortBtn.style.display = 'none';
            scanModal.classList.add('open');
        });

        document.getElementById('scan-modal-close')?.addEventListener('click', () => {
            scanModal.classList.remove('open');
            api.strategyScanAbort();
        });

        scanModal.addEventListener('click', e => { 
            if (e.target === scanModal) {
                scanModal.classList.remove('open');
                api.strategyScanAbort();
            }
        });

        scanStartBtn?.addEventListener('click', async () => {
            if (scanStartBtn) scanStartBtn.style.display = 'none';
            if (scanAbortBtn) scanAbortBtn.style.display = 'inline-flex';
            if (scanSummary) scanSummary.classList.remove('visible');
            if (scanList) scanList.innerHTML = '';
            const customDomain = scanDomainInput?.value.trim() || '';
            if (scanProgressLabel) scanProgressLabel.textContent = customDomain
                ? `Подготовка... домен: ${customDomain}`
                : 'Подготовка... весь list-general.txt';

            const res = await api.strategyScanStart(customDomain || undefined);
            
            if (scanAbortBtn) scanAbortBtn.style.display = 'none';
            if (scanStartBtn) {
                scanStartBtn.style.display = 'inline-flex';
                scanStartBtn.textContent = 'Сканировать заново';
            }

            if (res && res.ok && res.best) {
                bestFoundStrategy = res.best;
                if (scanSummary) scanSummary.classList.add('visible');
                if (scanSummaryText) scanSummaryText.textContent = `Рекомендуем: ${res.best} (${res.results.find((r:any) => r.strategy === res.best)?.label || ''})`;
                if (scanProgressLabel) scanProgressLabel.textContent = 'Сканирование завершено';
            } else {
                if (scanProgressLabel) scanProgressLabel.textContent = res?.error ? `Ошибка: ${res.error}` : 'Сканирование прервано или нет результатов';
            }
        });

        scanAbortBtn?.addEventListener('click', () => {
            api.strategyScanAbort();
            if (scanAbortBtn) scanAbortBtn.style.display = 'none';
            if (scanStartBtn) {
                scanStartBtn.style.display = 'inline-flex';
                scanStartBtn.textContent = 'Продолжить сканирование';
            }
            if (scanProgressLabel) scanProgressLabel.textContent = 'Сканирование остановлено';
        });

        scanApplyBtn?.addEventListener('click', () => {
            if (bestFoundStrategy && els.strategy) {
                els.strategy.value = bestFoundStrategy;
                saveState();
            }
            scanModal.classList.remove('open');
        });

        api.onScanProgress((p: any) => {
            if (!scanList) return;
            let row = document.getElementById(`scan-row-${p.strategy}`);
            if (!row) {
                row = document.createElement('div');
                row.id = `scan-row-${p.strategy}`;
                row.className = 'scan-row';
                row.innerHTML = `
                    <div class="scan-icon">⏳</div>
                    <div class="scan-strategy-name">${p.strategy}</div>
                    <div class="scan-bar-wrap"><div class="scan-bar" style="width: 0%; background: var(--accent-blue);"></div></div>
                    <div class="scan-status-text">Ожидание</div>
                `;
                scanList.appendChild(row);
            }

            const icon = row.querySelector('.scan-icon') as HTMLElement;
            const bar = row.querySelector('.scan-bar') as HTMLElement;
            const statusText = row.querySelector('.scan-status-text') as HTMLElement;

            // Remove active classes
            document.querySelectorAll('.scan-row').forEach(r => r.classList.remove('active'));

            if (p.status === 'testing') {
                row.classList.add('active');
                icon.innerHTML = '<div class="scan-spinner"></div>';
                bar.style.width = '50%';
                statusText.textContent = 'Проверка...';
                if (scanProgressLabel) scanProgressLabel.textContent = `Тестируем ${p.strategy}...`;
                row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else if (p.status === 'done') {
                // score is 0-100%
                bar.style.width = `${p.score}%`;
                if (p.score >= 80) {
                    icon.textContent = '✅';
                    bar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
                    statusText.textContent = `Отлично (${p.score}%)`;
                    row.classList.add('best');
                } else if (p.score >= 50) {
                    icon.textContent = '🟡';
                    bar.style.background = 'linear-gradient(90deg, #eab308, #fde047)';
                    statusText.textContent = `Хорошо (${p.score}%)`;
                } else if (p.score >= 20) {
                    icon.textContent = '🟠';
                    bar.style.background = 'linear-gradient(90deg, #f97316, #fb923c)';
                    statusText.textContent = `Слабо (${p.score}%)`;
                } else {
                    icon.textContent = '❌';
                    bar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
                    statusText.textContent = `Нет связи (${p.score}%)`;
                }
            } else if (p.status === 'error') {
                icon.textContent = '❌';
                bar.style.width = '100%';
                bar.style.background = '#ef4444';
                statusText.textContent = 'Ошибка';
            }
        });
    }

    // ── Status Monitor ──────────────────────────────────────────
    const monitorEl = document.getElementById('status-monitor');
    const monitorPlaceholder = document.getElementById('monitor-placeholder');
    const monitorRefreshBtn = document.getElementById('monitor-refresh-btn');
    let monitorInterval: ReturnType<typeof setInterval> | null = null;

    function resetMonitorToIdle() {
        if (!monitorEl) return;
        monitorEl.querySelectorAll('.monitor-item:not(#monitor-placeholder)').forEach(el => el.remove());
        if (monitorPlaceholder) monitorPlaceholder.style.display = 'block';
        if (monitorRefreshBtn) monitorRefreshBtn.style.display = 'none';
    }

    async function runStatusPing() {
        if (!monitorEl) return;
        const refreshBtn = monitorRefreshBtn;
        if (refreshBtn) { refreshBtn.classList.add('spinning'); }

        const res = await api.statusPing();
        if (!res || !res.ok) return;

        // Убираем старые айтемы, оставляем placeholder
        monitorEl.querySelectorAll('.monitor-item:not(#monitor-placeholder)').forEach(el => el.remove());
        if (monitorPlaceholder) monitorPlaceholder.style.display = 'none';
        if (refreshBtn) refreshBtn.style.display = 'flex';

        // Вставляем айтемы перед кнопкой refresh
        res.results.forEach((r: any) => {
            const item = document.createElement('div');
            item.className = 'monitor-item';
            const dotClass = !r.ok ? 'fail' : r.latencyMs < 200 ? 'ok' : 'slow';
            const latencyStr = r.ok ? `${r.latencyMs}ms` : '—';
            const shortDomain = r.domain.replace(/^www\./, '');
            item.innerHTML = `
                <div class="monitor-dot ${dotClass}"></div>
                <span>${shortDomain}</span>
                <span class="monitor-latency">${latencyStr}</span>
            `;
            monitorEl.insertBefore(item, refreshBtn);
        });

        if (refreshBtn) refreshBtn.classList.remove('spinning');
    }

    function startMonitorInterval() {
        stopMonitorInterval();
        monitorInterval = setInterval(runStatusPing, 30000); // авто-обновление каждые 30s
    }

    function stopMonitorInterval() {
        if (monitorInterval) { clearInterval(monitorInterval); monitorInterval = null; }
    }

    if (monitorRefreshBtn) {
        monitorRefreshBtn.addEventListener('click', runStatusPing);
    }

    // ── DNS Leak Test Modal ──────────────────────────────────
    const dnsModal = document.getElementById('dns-modal');
    const btnDnsLeak = document.getElementById('btn-dns-leak');
    const dnsRunBtn = document.getElementById('dns-run-btn');
    const dnsResultsList = document.getElementById('dns-results-list');
    const dnsVerdict = document.getElementById('dns-verdict');
    const dnsRunningLabel = document.getElementById('dns-running-label');

    const DNS_STATUS_MAP: Record<string, { icon: string; badge: string; label: string }> = {
        'ok':           { icon: '✅', badge: 'ok',           label: 'DNS + TCP работают' },
        'dpi-blocked':  { icon: '🚫', badge: 'dpi-blocked',  label: 'DNS OK, TCP заблокирован (DPI)' },
        'dns-poisoned': { icon: '⚠️', badge: 'dns-poisoned', label: 'DNS не резолвит домен' },
        'fully-blocked':{ icon: '❌', badge: 'fully-blocked',label: 'DNS + TCP заблокированы' },
    };

    if (dnsModal && btnDnsLeak) {
        btnDnsLeak.addEventListener('click', () => {
            if (dnsResultsList) dnsResultsList.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;">Нажмите «Запустить» для начала теста</div>';
            if (dnsVerdict) { dnsVerdict.className = 'dns-verdict'; dnsVerdict.textContent = ''; }
            dnsModal.classList.add('open');
        });
        document.getElementById('dns-modal-close')?.addEventListener('click', () => dnsModal.classList.remove('open'));
        dnsModal.addEventListener('click', e => { if (e.target === dnsModal) dnsModal.classList.remove('open'); });

        dnsRunBtn?.addEventListener('click', async () => {
            if (dnsRunBtn) dnsRunBtn.style.display = 'none';
            if (dnsRunningLabel) dnsRunningLabel.style.display = 'flex';
            if (dnsResultsList) dnsResultsList.innerHTML = '';
            if (dnsVerdict) { dnsVerdict.className = 'dns-verdict'; dnsVerdict.textContent = ''; }

            const res = await api.dnsLeakTest();

            if (dnsRunBtn) dnsRunBtn.style.display = 'inline-flex';
            if (dnsRunningLabel) dnsRunningLabel.style.display = 'none';

            if (!res || !res.ok) {
                if (dnsResultsList) dnsResultsList.innerHTML = '<div style="color:#ef4444;padding:16px;">Ошибка выполнения теста</div>';
                return;
            }

            if (dnsResultsList) dnsResultsList.innerHTML = '';
            let blocked = 0;

            res.results.forEach((r: any) => {
                const info = DNS_STATUS_MAP[r.status] || { icon: '❓', badge: 'fully-blocked', label: r.status };
                if (r.status !== 'ok') blocked++;

                const row = document.createElement('div');
                row.className = `dns-row ${r.status}`;
                const ipsText = r.ips?.length ? r.ips.slice(0, 2).join(', ') + (r.ips.length > 2 ? '...' : '') : '— не резолвит';
                const latStr = r.latencyMs ? `${r.latencyMs}ms` : '';
                row.innerHTML = `
                    <div class="dns-icon">${info.icon}</div>
                    <div class="dns-info">
                        <div class="dns-domain">${r.domain} <span style="font-size:10px;color:var(--text-secondary);font-weight:400">${latStr}</span></div>
                        <div class="dns-ips">IP: ${ipsText}</div>
                    </div>
                    <div class="dns-badge ${info.badge}">${info.label}</div>
                `;
                dnsResultsList!.appendChild(row);
            });

            // Вердикт
            if (dnsVerdict) {
                const total = res.results.length;
                if (blocked === 0) {
                    dnsVerdict.className = 'dns-verdict visible clean';
                    dnsVerdict.innerHTML = '✔️ <b>DNS утечек не обнаружен.</b> Все домены резолвятся и TCP-соединения работают.';
                } else {
                    dnsVerdict.className = 'dns-verdict visible leaking';
                    dnsVerdict.innerHTML = `⚠️ <b>Блокировка обнаружена</b> для ${blocked} из ${total} доменов. Запустите Zapret и повторите тест.`;
                }
            }
        });
    }

    // Обработка обновлений
    const btnCheckUpdate = document.getElementById('btn-check-update');
    const updateStatus = document.getElementById('update-status');
    const updateDesc = document.getElementById('update-desc');
    const updateIcon = document.getElementById('update-svg');
    const updateContainer = document.getElementById('update-icon-container');
    
    if (btnCheckUpdate) {
        btnCheckUpdate.onclick = () => (api as any).checkUpdate();
    }

    if ((api as any).onUpdateStatus) {
        (api as any).onUpdateStatus((status: string) => {
            if (!updateStatus || !updateDesc) return;
            const lang = (document.getElementById('app-lang') as HTMLSelectElement)?.value as 'ru' | 'en' || 'ru';
            
            // Сброс анимаций
            updateIcon?.classList.remove('spinning');
            updateContainer?.classList.remove('pulse');

            switch (status) {
                case 'checking':
                    updateStatus.textContent = i18n[lang].updateChecking;
                    updateStatus.style.color = 'var(--accent-blue)';
                    updateIcon?.classList.add('spinning');
                    updateContainer?.classList.add('pulse');
                    break;
                case 'available':
                    updateStatus.textContent = i18n[lang].updateAvailable;
                    updateStatus.style.color = '#10b981';
                    if (updateContainer) {
                        updateContainer.style.background = 'rgba(16, 185, 129, 0.1)';
                        updateContainer.style.color = '#10b981';
                    }
                    break;
                case 'latest':
                    updateStatus.textContent = i18n[lang].updateLatest;
                    updateStatus.style.color = 'var(--text-secondary)';
                    if (updateContainer) {
                        updateContainer.style.background = 'rgba(255,255,255,0.05)';
                        updateContainer.style.color = 'var(--text-secondary)';
                    }
                    break;
                case 'downloaded':
                    updateStatus.textContent = i18n[lang].updateDownloaded;
                    updateStatus.style.color = '#10b981';
                    break;
                case 'error':
                    updateStatus.textContent = i18n[lang].updateError;
                    updateStatus.style.color = '#ef4444';
                    if (updateContainer) {
                        updateContainer.style.background = 'rgba(239, 68, 68, 0.1)';
                        updateContainer.style.color = '#ef4444';
                    }
                    break;
            }
        });
    }

});
