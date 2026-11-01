const { app, BrowserWindow, ipcMain, dialog, protocol, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

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

function createSplashWindow() {
  const splashOpts = {
    width: 440,
    height: 290,
    frame: false,
    transparent: false,
    center: true,
    resizable: false,
    show: false,
    alwaysOnTop: true,
    hasShadow: true,
    backgroundColor: '#0a0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, 'assets', 'ulak_logo.png')
  };

  splashWindow = new BrowserWindow(splashOpts);
  splashWindow.loadFile(path.join(__dirname, 'renderer', 'splash.html'));

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });

  // Safety fallback in case splash is stuck
  setTimeout(() => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 4000);
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
    console.log('[ULAK] Main window ready-to-show, showing immediately.');
    if (splashWindow) {
      try { splashWindow.close(); } catch(e) {}
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
    mainWindow.moveTop();
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
  });
}

function startApplication() {
  // Register media-file protocol for HTML5 video/audio playback
  protocol.registerFileProtocol('media-file', (request, callback) => {
    let filePath = request.url.replace(/^media-file:\/\//, '');
    filePath = decodeURIComponent(filePath);
    if (process.platform === 'win32' && filePath.startsWith('/') && filePath[2] === ':') {
      filePath = filePath.slice(1);
    }
    callback({ path: path.normalize(filePath) });
  });

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
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
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
ipcMain.handle('bluetooth:connect-device', async (event, deviceId) => bluetoothManager.connectDevice(deviceId));
ipcMain.handle('bluetooth:battery-telemetry', async () => bluetoothManager.getBatteryTelemetry());
ipcMain.handle('bluetooth:restart-radio', async () => bluetoothManager.restartBluetoothRadio());
ipcMain.handle('bluetooth:open-settings', async () => {
  shell.openExternal('ms-settings:bluetooth');
  return { success: true };
});
ipcMain.handle('bluetooth:stealth-mode', async (event, enable) => bluetoothManager.setStealthMode(enable));

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
ipcMain.handle('youtube:download', async (event, url, options) => youtubeDownloader.downloadVideo(url, options));
ipcMain.handle('youtube:download-playlist', async (event, url, options) => youtubeDownloader.downloadPlaylist(url, options));
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
  return {
    platform: process.platform,
    release: os.release(),
    isAcrylicSupported,
    arch: os.arch(),
    hostname: os.hostname(),
    username: os.userInfo().username
  };
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

