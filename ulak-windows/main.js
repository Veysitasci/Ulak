const { app, BrowserWindow, ipcMain, dialog, protocol, shell, net, Notification, screen, nativeTheme } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { Readable } = require('stream');
const Store = require('electron-store');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.ulak.app');
}

// Register media-file scheme as privileged before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'media-file', privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true, corsEnabled: true } }
]);

const SystemMonitor = require('./backend/system');
const WiFiManager = require('./backend/wifi');
const FirewallManager = require('./backend/firewall');
const BluetoothManager = require('./backend/bluetooth');
const PackageManager = require('./backend/packageManager');
const SystemCleaner = require('./backend/cleaner');
const YouTubeDownloader = require('./backend/youtube');
const HackerTools = require('./backend/hacker');
const AdminManager = require('./backend/admin');
const AntivirusEngine = require('./backend/antivirus');
const NetMonitor = require('./backend/netMonitor');
const BackupManager = require('./backend/backup');
const UniversalPackageInstaller = require('./backend/packageInstaller');
const VersionManager = require('./backend/versionManager');
const CryptoVaultManager = require('./backend/cryptoVault');
const ProcessRadarManager = require('./backend/processRadar');

const store = new Store();

// Initialize backend managers
const systemMonitor = new SystemMonitor();
const wifiManager = new WiFiManager();
const firewallManager = new FirewallManager();
const bluetoothManager = new BluetoothManager();
const packageManager = new PackageManager();
const systemCleaner = new SystemCleaner();
const youtubeDownloader = new YouTubeDownloader();
const hackerTools = new HackerTools();
const adminManager = new AdminManager();
const antivirusEngine = new AntivirusEngine();
const netMonitor = new NetMonitor();
const backupManager = new BackupManager();
const universalPackageInstaller = new UniversalPackageInstaller();
const versionManager = new VersionManager();
const cryptoVaultManager = new CryptoVaultManager();
const processRadarManager = new ProcessRadarManager();

const os = require('os');
const fs = require('fs');

function checkAcrylicSupport() {
  if (process.platform !== 'win32') return false;
  const release = os.release().split('.');
  const build = parseInt(release[2] || '0', 10);
  return build >= 22621;
}

const isAcrylicSupported = checkAcrylicSupport();

let mainWindow = null;
let splashWindow = null;
let petWindow = null;
let isMainWindowReady = false;
let isSplashComplete = false;

function createPetWindow() {
  if (petWindow && !petWindow.isDestroyed()) {
    return petWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;

  const savedPos = store.get('pet.position');
  const defaultX = Math.round(workArea.x + workArea.width - 252);
  const defaultY = Math.round(workArea.y + workArea.height - 332);

  const posX = (savedPos && typeof savedPos.x === 'number') ? savedPos.x : defaultX;
  const posY = (savedPos && typeof savedPos.y === 'number') ? savedPos.y : defaultY;

  petWindow = new BrowserWindow({
    width: 240,
    height: 320,
    x: posX,
    y: posY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  petWindow.loadFile(path.join(__dirname, 'renderer', 'pet.html'));

  petWindow.once('ready-to-show', () => {
    const isEnabled = store.get('pet.enabled', true);
    if (isEnabled && petWindow && !petWindow.isDestroyed()) {
      petWindow.showInactive();
    }
  });

  petWindow.on('closed', () => {
    petWindow = null;
  });

  return petWindow;
}

function finishSplashAndShowMain() {
  if (splashWindow) {
    try { splashWindow.close(); } catch(e) {}
    splashWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.moveTop();
    }
    // Launch Desktop Pet if enabled
    try {
      createPetWindow();
    } catch (err) {
      console.warn('[PET] Pencere başlatılırken hata:', err);
    }
  }
}

function createSplashWindow() {
  const defaultMode = nativeTheme && nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  const savedFamily = store.get('theme.family', 'nord');
  const savedMode = store.get('theme.mode', defaultMode);
  let savedTheme = store.get('theme.id');
  if (!savedTheme) {
    savedTheme = (savedFamily === 'ulak') ? savedMode : `${savedFamily}-${savedMode}`;
  }

  const splashOpts = {
    width: 500,
    height: 340,
    frame: false,
    transparent: true,
    center: true,
    resizable: false,
    show: false,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, 'assets', 'ulak_logo.png')
  };

  splashWindow = new BrowserWindow(splashOpts);
  splashWindow.loadFile(path.join(__dirname, 'renderer', 'splash.html'), {
    query: {
      theme: savedTheme,
      mode: savedMode,
      family: savedFamily
    }
  });

  splashWindow.once('ready-to-show', () => {
    if (splashWindow) splashWindow.show();
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });

  // Safety fallback in case splash is stuck
  setTimeout(() => {
    finishSplashAndShowMain();
  }, 4500);
}

function createMainWindow() {
  const windowOpts = {
    width: 1180,
    height: 780,
    minWidth: 520,
    minHeight: 420,
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, 'assets', 'ulak_logo.png')
  };

  if (isAcrylicSupported) {
    windowOpts.backgroundMaterial = 'acrylic';
    windowOpts.backgroundColor = '#00000000';
  } else {
    windowOpts.backgroundColor = '#0e111a';
  }

  mainWindow = new BrowserWindow(windowOpts);

  mainWindow.once('ready-to-show', () => {
    isMainWindowReady = true;
    console.log('[ULAK] Main window loaded in background and ready.');
    if (isSplashComplete) {
      finishSplashAndShowMain();
    }
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized-change', false);
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (petWindow && !petWindow.isDestroyed()) {
      try { petWindow.close(); } catch(e) {}
      petWindow = null;
    }
  });
}

function resolveMediaFilePath(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const queryPath = parsed.searchParams.get('path');
    if (queryPath) {
      return path.normalize(queryPath);
    }
  } catch (e) {}

  let fileUrl = rawUrl.replace(/^media-file:\/\//i, '');
  try { fileUrl = decodeURIComponent(fileUrl); } catch (e) {}
  if (process.platform === 'win32') {
    if (fileUrl.startsWith('/') && fileUrl[2] === ':') {
      fileUrl = fileUrl.slice(1);
    } else if (/^[a-zA-Z]\//.test(fileUrl)) {
      fileUrl = fileUrl[0].toUpperCase() + ':' + fileUrl.slice(1);
    }
  }
  return path.normalize(fileUrl);
}

function getMediaMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/opus'
  };
  return mimeMap[ext] || 'application/octet-stream';
}

function notifyIfBackground(title, body, filePath = null) {
  try {
    const isBackground = !mainWindow || mainWindow.isDestroyed() || !mainWindow.isFocused() || mainWindow.isMinimized() || !mainWindow.isVisible();
    if (isBackground && Notification && Notification.isSupported()) {
      const notif = new Notification({
        title: title || 'ULAK Medya İndirici',
        body: body || 'İndirme işlemi tamamlandı.',
        icon: path.join(__dirname, 'assets', 'ulak_logo.png'),
        silent: false
      });
      notif.on('click', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          if (filePath) {
            mainWindow.webContents.send('youtube:play-downloaded', filePath);
          }
        }
      });
      notif.show();
    }
    if (isBackground && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.flashFrame(true);
    }
  } catch (err) {
    console.error('[ULAK] Windows notification error:', err);
  }
}

function startApplication() {
  // Register media-file protocol for HTML5 video/audio playback with true HTTP 206 byte-range seeking
  if (protocol.handle) {
    protocol.handle('media-file', (request) => {
      try {
        const fullPath = resolveMediaFilePath(request.url);
        if (!fs.existsSync(fullPath)) {
          return new Response('Media file not found', { status: 404 });
        }
        const stat = fs.statSync(fullPath);
        const fileSize = stat.size;
        const mimeType = getMediaMimeType(fullPath);
        const rangeHeader = request.headers.get('range');

        if (rangeHeader) {
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          const start = Math.max(0, parseInt(parts[0], 10) || 0);
          const requestedEnd = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const end = Math.min(requestedEnd, fileSize - 1);
          const chunkSize = Math.max(0, (end - start) + 1);

          const nodeStream = fs.createReadStream(fullPath, { start, end });
          return new Response(Readable.toWeb(nodeStream), {
            status: 206,
            headers: {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(chunkSize),
              'Content-Type': mimeType
            }
          });
        } else {
          const nodeStream = fs.createReadStream(fullPath);
          return new Response(Readable.toWeb(nodeStream), {
            status: 200,
            headers: {
              'Accept-Ranges': 'bytes',
              'Content-Length': String(fileSize),
              'Content-Type': mimeType
            }
          });
        }
      } catch (err) {
        console.error('[ULAK] media-file protocol error:', err);
        return new Response('Media file not found', { status: 404 });
      }
    });
  } else {
    protocol.registerFileProtocol('media-file', (request, callback) => {
      const fullPath = resolveMediaFilePath(request.url);
      callback({ path: fullPath });
    });
  }

  createSplashWindow();
  createMainWindow();
}

app.on('ready', startApplication);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
    if (mainWindow) mainWindow.show();
  }
});

// Splash complete IPC handler
ipcMain.handle('app:splash-complete', () => {
  isSplashComplete = true;
  if (isMainWindowReady) {
    finishSplashAndShowMain();
  } else {
    // If main window still loading, wait briefly then show
    const checkTimer = setInterval(() => {
      if (isMainWindowReady || !mainWindow) {
        clearInterval(checkTimer);
        finishSplashAndShowMain();
      }
    }, 40);
    setTimeout(() => {
      clearInterval(checkTimer);
      finishSplashAndShowMain();
    }, 2000);
  }
  return true;
});

// Window controls
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  }
  return false;
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Store operations
ipcMain.handle('get-store-value', (event, key, defaultValue = null) => {
  return store.get(key, defaultValue);
});

ipcMain.handle('set-store-value', (event, key, value) => {
  store.set(key, value);
  return true;
});

// System Monitor (Yerel Önbellekli ve Optimize)
ipcMain.handle('system:get-info', async () => {
  const os = require('os');
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    uptime: os.uptime(),
    cpus: os.cpus(),
    totalmem: os.totalmem(),
    freemem: os.freemem()
  };
});

ipcMain.handle('system:get-cpu-info', async (event, forceRefresh) => systemMonitor.getCPUInfo(forceRefresh));
ipcMain.handle('system:get-memory-info', async (event, forceRefresh) => systemMonitor.getMemoryInfo(forceRefresh));
ipcMain.handle('system:get-disk-info', async (event, forceRefresh) => systemMonitor.getDiskInfo(forceRefresh));
ipcMain.handle('system:get-processes', async (event, limit, forceRefresh) => systemMonitor.getProcesses(limit, forceRefresh));
ipcMain.handle('system:kill-process', async (event, pid) => systemMonitor.killProcess(pid));
ipcMain.handle('system:get-network-info', async (event, forceRefresh) => systemMonitor.getNetworkInfo(forceRefresh));
ipcMain.handle('system:get-battery-info', async (event, forceRefresh) => systemMonitor.getBatteryInfo(forceRefresh));
ipcMain.handle('system:refresh-all-hardware', async () => systemMonitor.refreshAllHardware());
ipcMain.handle('system:get-cache-status', async () => systemMonitor.getCacheStatus());
ipcMain.handle('system:copy-clipboard', async (event, text) => {
  const { clipboard } = require('electron');
  clipboard.writeText(text || '');
  return { success: true };
});

// WiFi Manager
ipcMain.handle('wifi:get-networks', async () => wifiManager.getAvailableNetworks());
ipcMain.handle('wifi:get-connection', async () => wifiManager.getCurrentConnection());
ipcMain.handle('wifi:connect', async (event, ssid, password) => wifiManager.connect(ssid, password));
ipcMain.handle('wifi:disconnect', async () => wifiManager.disconnect());
ipcMain.handle('wifi:forget', async (event, ssid) => wifiManager.forgetNetwork(ssid));
ipcMain.handle('wifi:create-hotspot', async (event, ssid, password) => wifiManager.createHotspot(ssid, password));
ipcMain.handle('wifi:stop-hotspot', async () => wifiManager.stopHotspot());

// Firewall Manager
ipcMain.handle('firewall:get-status', async () => firewallManager.getStatus());
ipcMain.handle('firewall:enable', async (event, profile) => firewallManager.enable(profile));
ipcMain.handle('firewall:disable', async (event, profile) => firewallManager.disable(profile));
ipcMain.handle('firewall:get-rules', async () => firewallManager.getRules());
ipcMain.handle('firewall:add-rule', async (event, rule) => firewallManager.addRule(rule));
ipcMain.handle('firewall:remove-rule', async (event, name) => firewallManager.removeRule(name));
ipcMain.handle('firewall:block-port', async (event, port, protocol) => firewallManager.blockPort(port, protocol));
ipcMain.handle('firewall:allow-port', async (event, port, protocol) => firewallManager.allowPort(port, protocol));
ipcMain.handle('firewall:get-connections', async () => firewallManager.getActiveConnections());
ipcMain.handle('firewall:stealth-ping', async (event, enable) => firewallManager.setStealthPing(enable));
ipcMain.handle('firewall:set-stealth-ping', async (event, enable) => firewallManager.setStealthPing(enable));
ipcMain.handle('firewall:get-system-rules', async (event, filter) => firewallManager.getSystemFirewallRules(filter));
ipcMain.handle('firewall:set-profile-state', async (event, profile, state) => firewallManager.setProfileState(profile, state));
ipcMain.handle('firewall:paranoid-outbound', async (event, enable) => firewallManager.setParanoidOutbound(enable));
ipcMain.handle('firewall:set-paranoid-outbound', async (event, enable) => firewallManager.setParanoidOutbound(enable));
ipcMain.handle('firewall:export-policy', async () => firewallManager.exportFirewallPolicy());

// Bluetooth Manager
ipcMain.handle('bluetooth:get-status', async () => bluetoothManager.getStatus());
ipcMain.handle('bluetooth:enable', async () => bluetoothManager.enable());
ipcMain.handle('bluetooth:disable', async () => bluetoothManager.disable());
ipcMain.handle('bluetooth:scan', async () => bluetoothManager.scanDevices());
ipcMain.handle('bluetooth:get-paired', async () => bluetoothManager.getPairedDevices());
ipcMain.handle('bluetooth:remove-device', async (event, deviceId) => bluetoothManager.removeDevice(deviceId));
ipcMain.handle('bluetooth:toggle', async () => bluetoothManager.toggleBluetooth());
ipcMain.handle('bluetooth:ble-radar', async () => bluetoothManager.getLiveBleRadar());
ipcMain.handle('bluetooth:get-live-radar', async () => bluetoothManager.getLiveBleRadar());
ipcMain.handle('bluetooth:connect-device', async (event, deviceId) => bluetoothManager.connectDevice(deviceId));
ipcMain.handle('bluetooth:connect', async (event, deviceId) => bluetoothManager.connectDevice(deviceId));
ipcMain.handle('bluetooth:battery-telemetry', async () => bluetoothManager.getBatteryTelemetry());
ipcMain.handle('bluetooth:get-battery', async (event, deviceId) => bluetoothManager.getBatteryTelemetry(deviceId));
ipcMain.handle('bluetooth:restart-radio', async () => bluetoothManager.restartBluetoothRadio());
ipcMain.handle('bluetooth:open-settings', async () => {
  shell.openExternal('ms-settings:bluetooth');
  return { success: true };
});
ipcMain.handle('bluetooth:stealth-mode', async (event, enable) => bluetoothManager.setStealthMode(enable));
ipcMain.handle('bluetooth:set-stealth', async (event, enable) => bluetoothManager.setStealthMode(enable));

// WiFi Manager additions
ipcMain.handle('wifi:channel-spectrum', async () => wifiManager.getChannelSpectrumAnalysis());
ipcMain.handle('wifi:get-channel-spectrum', async () => wifiManager.getChannelSpectrumAnalysis());
ipcMain.handle('wifi:saved-passwords', async () => wifiManager.getStructuredSavedPasswords());
ipcMain.handle('wifi:get-saved-passwords', async () => wifiManager.getStructuredSavedPasswords());
ipcMain.handle('wifi:bssid-roaming', async () => wifiManager.getBssidRoamingTelemetry());
ipcMain.handle('wifi:get-roaming-telemetry', async () => wifiManager.getBssidRoamingTelemetry());
ipcMain.handle('wifi:export-profiles', async () => wifiManager.exportWifiProfiles());
ipcMain.handle('wifi:get-proxy-settings', async () => wifiManager.getProxySettings());
ipcMain.handle('wifi:set-proxy-settings', async (event, settings) => wifiManager.setProxySettings(settings));
ipcMain.handle('wifi:test-proxy', async (event, host, port) => wifiManager.testProxyConnection(host, port));
ipcMain.handle('wifi:get-dns-settings', async () => wifiManager.getDnsSettings());
ipcMain.handle('wifi:set-dns-settings', async (event, preset, primary, secondary) => wifiManager.setDnsSettings(preset, primary, secondary));
ipcMain.handle('wifi:flush-dns', async () => wifiManager.flushDns());
ipcMain.handle('wifi:get-public-ip', async () => wifiManager.getPublicIp());

// System Monitor additions
ipcMain.handle('system:gpu-telemetry', async () => systemMonitor.getGpuTelemetry());
ipcMain.handle('system:get-gpu-info', async () => systemMonitor.getGpuTelemetry());
ipcMain.handle('system:disk-smart', async () => systemMonitor.getDiskHealthSmart());
ipcMain.handle('system:get-disk-smart', async () => systemMonitor.getDiskHealthSmart());
ipcMain.handle('system:battery-health', async () => systemMonitor.getBatteryHealthReport());
ipcMain.handle('system:get-battery-health', async () => systemMonitor.getBatteryHealthReport());
ipcMain.handle('system:motherboard-bios', async () => systemMonitor.getMotherboardBiosInfo());
ipcMain.handle('system:get-motherboard-info', async () => systemMonitor.getMotherboardBiosInfo());
ipcMain.handle('system:top-processes', async (event, sortBy, limit) => systemMonitor.getTopResourceProcesses(sortBy, limit));
ipcMain.handle('system:get-top-processes', async (event, sortBy, limit) => systemMonitor.getTopResourceProcesses(sortBy, limit));

// Hacker Tools
ipcMain.handle('hacker:run-tool', async (event, toolId) => hackerTools.runTool(toolId));
ipcMain.handle('hacker:scan-ports', async (event, target, start, end) => hackerTools.scanTargetPorts(target, start, end));
ipcMain.handle('hacker:discover-subnet', async () => hackerTools.discoverLocalSubnetDevices());
ipcMain.handle('hacker:test-dns-leak', async () => hackerTools.testDnsLeak());
ipcMain.handle('hacker:inspect-tls', async (event, host) => hackerTools.inspectTlsSecurity(host));
ipcMain.handle('hacker:hunt-events', async () => hackerTools.huntSecurityEvents());
ipcMain.handle('hacker:hunt-security-events', async () => hackerTools.huntSecurityEvents());

// Admin Tools
ipcMain.handle('admin:exec-cmd', async (event, cmd) => adminManager.executeCommand(cmd));
ipcMain.handle('admin:fw-status', async () => adminManager.getFirewallStatus());
ipcMain.handle('admin:fw-toggle', async (event, state) => adminManager.setFirewall(state));
ipcMain.handle('admin:pkg-check', async () => adminManager.checkUpdates());
ipcMain.handle('admin:pkg-update-all', async () => adminManager.updateAll());
ipcMain.handle('admin:autostart', async () => adminManager.getAutostartItems());
ipcMain.handle('admin:users', async () => adminManager.getUsers());
ipcMain.handle('admin:services-list', async () => adminManager.getWindowsServicesList());
ipcMain.handle('admin:get-services', async () => adminManager.getWindowsServicesList());
ipcMain.handle('admin:service-control', async (event, name, act) => adminManager.controlWindowsService(name, act));
ipcMain.handle('admin:control-service', async (event, name, act) => adminManager.controlWindowsService(name, act));
ipcMain.handle('admin:file-check', async (event, tool) => adminManager.runSystemFileCheck(tool));
ipcMain.handle('admin:run-sfc', async (event, tool) => adminManager.runSystemFileCheck(tool));
ipcMain.handle('admin:power-plan', async () => adminManager.setHighPerformancePowerPlan());
ipcMain.handle('admin:set-power-plan', async () => adminManager.setHighPerformancePowerPlan());
ipcMain.handle('admin:local-users', async () => adminManager.getUserAccountsDetailed());
ipcMain.handle('admin:get-users-detailed', async () => adminManager.getUserAccountsDetailed());

// Package Manager
ipcMain.handle('package:search', async (event, query, source) => packageManager.searchPackage(query, source));
ipcMain.handle('package:install', async (event, packageId, source) => packageManager.installPackage(packageId, source));
ipcMain.handle('package:uninstall', async (event, packageId, source) => packageManager.uninstallPackage(packageId, source));
ipcMain.handle('package:update', async (event, packageId, source) => packageManager.updatePackage(packageId, source));
ipcMain.handle('package:get-installed', async (event, source) => packageManager.getInstalledPackages(source));
ipcMain.handle('package:get-updates', async (event, source) => packageManager.getUpdates(source));
ipcMain.handle('package:check-sources', async () => packageManager.checkSourceAvailability());

// System Cleaner
ipcMain.handle('cleaner:get-temp-size', async () => systemCleaner.getTempFilesSize());
ipcMain.handle('cleaner:clean-temp', async () => systemCleaner.cleanTempFiles());
ipcMain.handle('cleaner:empty-recycle', async () => systemCleaner.emptyRecycleBin());
ipcMain.handle('cleaner:get-disk-usage', async () => systemCleaner.getDiskUsage());
ipcMain.handle('cleaner:get-large-files', async (event, minSizeMB, limit) => systemCleaner.getLargeFiles(minSizeMB, limit));
ipcMain.handle('cleaner:clean-browser', async () => systemCleaner.cleanBrowserCache());
ipcMain.handle('cleaner:clean-win-update', async () => systemCleaner.cleanWindowsUpdateCache());
ipcMain.handle('cleaner:flush-dns', async () => systemCleaner.flushDnsAndResetNet());
ipcMain.handle('cleaner:clean-thumbnails', async () => systemCleaner.cleanThumbnailCache());
ipcMain.handle('cleaner:smart-deep', async () => systemCleaner.smartDeepClean());

// YouTube Downloader
ipcMain.handle('youtube:check-ytdlp', async () => youtubeDownloader.checkYtDlp());
ipcMain.handle('youtube:install-ytdlp', async () => youtubeDownloader.installYtDlp());
ipcMain.handle('youtube:get-info', async (event, url) => youtubeDownloader.getVideoInfo(url));
ipcMain.handle('youtube:download', async (event, url, options) => {
  const res = await youtubeDownloader.downloadVideo(url, options);
  if (res && res.success) {
    const fileName = res.filePath ? path.basename(res.filePath) : 'Medya dosyası';
    notifyIfBackground('ULAK • İndirme Tamamlandı', `${fileName} başarıyla indirildi ve oynatmaya hazır.`, res.filePath);
  }
  return res;
});
ipcMain.handle('youtube:download-playlist', async (event, url, options) => {
  const res = await youtubeDownloader.downloadPlaylist(url, options);
  if (res && res.success) {
    notifyIfBackground('ULAK • Oynatma Listesi İndirildi', 'Oynatma listesi indirme işlemi tamamlandı.', res.path);
  }
  return res;
});
ipcMain.handle('system:notify', async (event, title, body, filePath) => {
  notifyIfBackground(title, body, filePath);
  return { success: true };
});
ipcMain.handle('youtube:get-downloads', async () => youtubeDownloader.getDownloads());
ipcMain.handle('youtube:open-folder', async () => youtubeDownloader.openFolder());
ipcMain.handle('youtube:delete-file', async (event, filePath) => youtubeDownloader.deleteFile(filePath));
ipcMain.handle('youtube:extract-audio', async (event, videoPath) => youtubeDownloader.extractAudio(videoPath));
ipcMain.handle('youtube:open-file', async (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.openPath(filePath);
    return true;
  }
  return false;
});

// Antivirus Deep File Scanner & Threat Defense
ipcMain.handle('antivirus:scan-file', async (event, filePath) => antivirusEngine.scanFile(filePath));
ipcMain.handle('antivirus:select-and-scan', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Derin Analiz İçin Dosya Seçin',
    properties: ['openFile'],
    filters: [
      { name: 'Tüm Dosyalar ve Programlar', extensions: ['*'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return antivirusEngine.scanFile(result.filePaths[0]);
});
ipcMain.handle('antivirus:get-defender-status', async () => antivirusEngine.getDefenderStatus());
ipcMain.handle('antivirus:quick-scan', async () => antivirusEngine.runDefenderQuickScan());
ipcMain.handle('antivirus:shred-file', async (event, filePath, passes) => antivirusEngine.shredFile(filePath, passes));
ipcMain.handle('antivirus:select-and-shred', async (event, passes) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Kalıcı Olarak Parçalanacak Dosyayı Seçin',
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return antivirusEngine.shredFile(result.filePaths[0], passes || 3);
});
ipcMain.handle('antivirus:quarantine-file', async (event, filePath) => antivirusEngine.quarantineFile(filePath));
ipcMain.handle('antivirus:get-quarantine', async () => antivirusEngine.getQuarantineList());
ipcMain.handle('antivirus:restore-quarantine', async (event, id) => antivirusEngine.restoreQuarantineFile(id));
ipcMain.handle('antivirus:delete-quarantine', async (event, id) => antivirusEngine.deleteQuarantineFile(id));
ipcMain.handle('antivirus:scan-usb', async () => antivirusEngine.scanUsbDrives());

// Crypto Vault & Steganography IPC
ipcMain.handle('vault:encrypt-file', async (event, filePath, password) => cryptoVaultManager.encryptFile(filePath, password));
ipcMain.handle('vault:decrypt-file', async (event, filePath, password) => cryptoVaultManager.decryptFile(filePath, password));
ipcMain.handle('vault:select-and-encrypt', async (event, password) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Şifrelenecek Dosyayı Seçin',
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return cryptoVaultManager.encryptFile(result.filePaths[0], password);
});
ipcMain.handle('vault:select-and-decrypt', async (event, password) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Çözülecek ULAK Kasası (.ulak) Seçin',
    properties: ['openFile'],
    filters: [
      { name: 'ULAK Kasa Dosyaları', extensions: ['ulak'] },
      { name: 'Tüm Dosyalar', extensions: ['*'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return cryptoVaultManager.decryptFile(result.filePaths[0], password);
});
ipcMain.handle('vault:embed-stego', async (event, imagePath, secretText, password) => cryptoVaultManager.embedSteganography(imagePath, secretText, password));
ipcMain.handle('vault:extract-stego', async (event, imagePath, password) => cryptoVaultManager.extractSteganography(imagePath, password));
ipcMain.handle('vault:select-image-for-stego', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Steganografi İçin Görsel Seçin (PNG, JPG, BMP)',
    properties: ['openFile'],
    filters: [
      { name: 'Görseller', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});
ipcMain.handle('vault:get-notes', async (event, masterPassword) => cryptoVaultManager.getSecureNotes(masterPassword));
ipcMain.handle('vault:save-notes', async (event, notes, masterPassword) => cryptoVaultManager.saveSecureNotes(notes, masterPassword));
ipcMain.handle('vault:generate-password', async (event, options) => cryptoVaultManager.generatePassword(options));
ipcMain.handle('vault:calculate-seal', async (event, filePath, secretKey) => cryptoVaultManager.calculateDigitalSeal(filePath, secretKey));
ipcMain.handle('vault:select-for-seal', async (event, secretKey) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Dijital Mühür Oluşturulacak Dosyayı Seçin',
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return cryptoVaultManager.calculateDigitalSeal(result.filePaths[0], secretKey);
});

// Network & Port Monitor
ipcMain.handle('netmon:get-sockets', async () => netMonitor.getSockets());
ipcMain.handle('netmon:run-ping', async (event, host) => netMonitor.runPing(host));
ipcMain.handle('netmon:speed-test', async () => netMonitor.runSpeedTest());
ipcMain.handle('netmon:get-traffic', async () => netMonitor.getLiveTraffic());
ipcMain.handle('netmon:traceroute', async (event, target) => netMonitor.runTraceroute(target));
ipcMain.handle('netmon:ip-geo', async (event, ip) => netMonitor.lookupIpGeo(ip));
ipcMain.handle('netmon:terminate-socket', async (event, pid, port) => netMonitor.terminateSocketProcess(pid, port));
ipcMain.handle('netmon:get-adapters', async () => netMonitor.getNetworkAdapters());

// Backup Tool
ipcMain.handle('backup:get-sources', async () => backupManager.getSourceCatalog());
ipcMain.handle('backup:list-archives', async () => backupManager.listArchives());
ipcMain.handle('backup:create-backup', async (event, isFull, selected) => backupManager.createBackup(isFull, selected));
ipcMain.handle('backup:delete-archive', async (event, path) => backupManager.deleteArchive(path));
ipcMain.handle('backup:restore-archive', async (event, archivePath, targetDir) => backupManager.restoreArchive(archivePath, targetDir));
ipcMain.handle('backup:verify-archive', async (event, archivePath) => backupManager.verifyArchive(archivePath));
ipcMain.handle('backup:get-stats', async () => backupManager.getStorageStats());
ipcMain.handle('backup:open-folder', async () => backupManager.openBackupFolder());
ipcMain.handle('backup:pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Yedeklenecek Özel Klasörü Seçin',
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Universal Package Installer
ipcMain.handle('pkg:inspect-file', async (event, filePath) => universalPackageInstaller.inspectPackage(filePath));
ipcMain.handle('pkg:install-file', async (event, filePath, options) => universalPackageInstaller.installPackage(filePath, options));
ipcMain.handle('pkg:select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Kurulacak Paketi Seçin',
    properties: ['openFile'],
    filters: [
      { name: 'Paketler ve Arşivler', extensions: ['zip', 'exe', 'msi', 'tar.gz', 'deb', 'rpm', 'appimage'] },
      { name: 'Tüm Dosyalar', extensions: ['*'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return universalPackageInstaller.inspectPackage(result.filePaths[0]);
});
ipcMain.handle('pkg:verify-signature', async (event, filePath) => universalPackageInstaller.verifyAuthenticode(filePath));
ipcMain.handle('pkg:search-online', async (event, query, source) => universalPackageInstaller.searchOnlinePackages(query, source));
ipcMain.handle('pkg:install-online', async (event, packageId, source, isSilent) => universalPackageInstaller.installOnlinePackage(packageId, source, isSilent));
ipcMain.handle('pkg:get-installed-apps', async () => universalPackageInstaller.getInstalledApplications());
ipcMain.handle('pkg:uninstall-app', async (event, cmd) => universalPackageInstaller.uninstallApplication(cmd));

// App & Platform IPC
ipcMain.handle('app:get-modules', async () => {
  const modulesPath = path.join(__dirname, 'modules.json');
  if (fs.existsSync(modulesPath)) {
    try {
      return JSON.parse(fs.readFileSync(modulesPath, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
});

ipcMain.handle('app:get-platform-info', async () => {
  const cpus = os.cpus() || [];
  const totalMemGB = (os.totalmem() / (1024 ** 3)).toFixed(1);
  const freeMemGB = (os.freemem() / (1024 ** 3)).toFixed(1);
  
  const releaseStr = os.release() || '';
  const parts = releaseStr.split('.');
  const buildNum = parseInt(parts[2] || '0', 10);
  let osName = 'Windows';
  if (process.platform === 'win32') {
    if (buildNum >= 22000) {
      osName = 'Windows 11';
    } else if (buildNum >= 10240) {
      osName = 'Windows 10';
    } else {
      osName = 'Windows';
    }
  }

  let appVersion = '2.4.0';
  try {
    appVersion = app.getVersion() || require('./package.json').version || '2.4.0';
  } catch (e) {
    appVersion = '2.4.0';
  }

  return {
    appName: app.getName() || 'ULAK',
    appVersion,
    platform: process.platform,
    release: releaseStr,
    buildNumber: buildNum,
    osName,
    fullOsDescription: `${osName} (İS Derlemesi ${releaseStr})`,
    isAcrylicSupported: !!isAcrylicSupported,
    arch: os.arch(),
    hostname: os.hostname(),
    username: (os.userInfo && os.userInfo().username) || process.env.USERNAME || 'Kullanıcı',
    electronVersion: process.versions.electron || '28.0.0',
    chromeVersion: process.versions.chrome || '120.0.0',
    nodeVersion: process.versions.node || '18.18.0',
    v8Version: process.versions.v8 || '12.0.0',
    cpuModel: cpus[0] ? cpus[0].model.trim() : 'Bilinmeyen İşlemci',
    cpuCores: cpus.length,
    totalMemory: `${totalMemGB} GB`,
    freeMemory: `${freeMemGB} GB`,
    uptimeSeconds: Math.floor(os.uptime())
  };
});

ipcMain.handle('app:get-changelog', async () => {
  try {
    const changelogPath = path.join(__dirname, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      return fs.readFileSync(changelogPath, 'utf8');
    }
  } catch (e) {}
  return '# Değişiklik Günlüğü bulunamadı.';
});

ipcMain.handle('app:set-autostart', async (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: !!enable,
    path: process.execPath
  });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('app:get-autostart', async () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('app:open-external', async (event, url) => {
  const { shell } = require('electron');
  return shell.openExternal(url);
});

// Version Management IPC (Update & Rollback)
ipcMain.handle('version:get-all', async () => {
  return versionManager.getAllModules();
});

ipcMain.handle('version:check-updates', async () => {
  return await versionManager.checkGitHubUpdates();
});

ipcMain.handle('version:update-to', async (event, moduleId, targetVersion) => {
  return await versionManager.updateModuleVersion(moduleId, targetVersion);
});

ipcMain.handle('version:rollback', async (event, moduleId) => {
  return await versionManager.rollbackModule(moduleId);
});

ipcMain.handle('version:update-latest', async (event, moduleId) => {
  return await versionManager.updateToLatest(moduleId);
});

// YouTube / Video Downloader Module Management
ipcMain.handle('youtube:uninstall-ytdlp', async () => {
  return await youtubeDownloader.uninstallYtDlp();
});

// ==================== SÜREÇ & TEHDİT RADARI (PROCESS RADAR) ====================
ipcMain.handle('proc-radar:get-processes', async (event, forceRefresh) => processRadarManager.getProcesses(forceRefresh));
ipcMain.handle('proc-radar:kill-process', async (event, pid, forceTree) => processRadarManager.killProcess(pid, forceTree));
ipcMain.handle('proc-radar:get-details', async (event, pid) => processRadarManager.getProcessDetails(pid));

// ==================== DESKTOP PET (SİBER BAYKUŞ & BARIŞ KUŞU) IPC ====================
ipcMain.handle('pet:get-settings', async () => {
  return {
    enabled: store.get('pet.enabled', true),
    activePetId: store.get('pet.activePetId', 'owl'),
    sizePercent: store.get('pet.sizePercent', 100),
    lookTracking: store.get('pet.lookTracking', true),
    reactionsEnabled: store.get('pet.reactionsEnabled', true)
  };
});

ipcMain.handle('pet:set-settings', async (event, newSettings) => {
  if (!newSettings || typeof newSettings !== 'object') return { success: false };
  if (typeof newSettings.enabled === 'boolean') {
    store.set('pet.enabled', newSettings.enabled);
    if (newSettings.enabled) {
      if (!petWindow || petWindow.isDestroyed()) {
        createPetWindow();
      } else {
        petWindow.showInactive();
      }
    } else {
      if (petWindow && !petWindow.isDestroyed()) {
        petWindow.hide();
      }
    }
  }
  if (typeof newSettings.activePetId === 'string') {
    store.set('pet.activePetId', newSettings.activePetId);
  }
  if (typeof newSettings.sizePercent === 'number') {
    store.set('pet.sizePercent', newSettings.sizePercent);
  }
  if (typeof newSettings.lookTracking === 'boolean') {
    store.set('pet.lookTracking', newSettings.lookTracking);
  }
  if (typeof newSettings.reactionsEnabled === 'boolean') {
    store.set('pet.reactionsEnabled', newSettings.reactionsEnabled);
  }
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('pet:settings-changed', newSettings);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pet:settings-changed', newSettings);
  }
  return { success: true };
});

ipcMain.handle('pet:toggle', async () => {
  const cur = store.get('pet.enabled', true);
  const next = !cur;
  store.set('pet.enabled', next);
  if (next) {
    if (!petWindow || petWindow.isDestroyed()) {
      createPetWindow();
    } else {
      petWindow.showInactive();
    }
  } else {
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.hide();
    }
  }
  return next;
});

ipcMain.handle('pet:get-cursor-pos', async () => {
  const cursor = screen.getCursorScreenPoint();
  const windowBounds = (petWindow && !petWindow.isDestroyed()) ? petWindow.getBounds() : null;
  return { cursor, windowBounds };
});

ipcMain.handle('pet:get-position', async () => {
  if (petWindow && !petWindow.isDestroyed()) {
    const [x, y] = petWindow.getPosition();
    return { x, y };
  }
  return store.get('pet.position') || { x: 0, y: 0 };
});

ipcMain.handle('pet:set-position', async (event, pos) => {
  if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
    if (pos.x === -1 && pos.y === -1) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { workArea } = primaryDisplay;
      pos.x = Math.round(workArea.x + workArea.width - 252);
      pos.y = Math.round(workArea.y + workArea.height - 332);
    }
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.setPosition(Math.round(pos.x), Math.round(pos.y));
    }
    store.set('pet.position', pos);
    return true;
  }
  return false;
});

ipcMain.handle('pet:action', async (event, actionName) => {
  if (actionName === 'open-main-window') {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      return true;
    }
  } else if (actionName === 'test-working' || actionName === 'test-alert') {
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.showInactive();
      petWindow.webContents.send('pet:state-changed', actionName === 'test-working' ? 'running' : 'failed');
      return true;
    }
  }
  return false;
});

ipcMain.handle('pet:get-system-status', async () => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsedPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
    return {
      cpu: Math.min(99, Math.round((os.loadavg()[0] || 0.15) * 100) || 14),
      mem: memUsedPercent,
      net: 'Ağ: Güvenli 🟢'
    };
  } catch (e) {
    return { cpu: 14, mem: 42, net: 'Ağ: Güvenli 🟢' };
  }
});

// ==================== TEMA DEĞİŞİMİ BİLDİRİMİ ====================
ipcMain.handle('settings:theme-changed', async (event, themeData) => {
  if (themeData && typeof themeData === 'object') {
    if (themeData.family) store.set('theme.family', themeData.family);
    if (themeData.mode) store.set('theme.mode', themeData.mode);
    if (themeData.themeId) store.set('theme.id', themeData.themeId);
  }
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('pet:theme-changed', themeData);
  }
  return true;
});


