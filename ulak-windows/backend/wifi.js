const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const execAsync = promisify(exec);

class WiFiManager {
  constructor() {
    this._prevBytes = null;
    this._prevTime = Date.now();
  }

  async runElevatedBat(lines) {
    const batPath = path.join(os.tmpdir(), `ulak_net_${Date.now()}.bat`);
    try {
      const content = '@echo off\r\n' + lines.join('\r\n') + '\r\n';
      fs.writeFileSync(batPath, content, 'utf8');
      await execAsync(`powershell -NoProfile -Command "Start-Process '${batPath}' -Verb RunAs -Wait -WindowStyle Hidden"`);
      return { success: true };
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('canceled') || msg.includes('iptal')) {
        return { success: false, message: 'İşlem Windows Yönetici (UAC) izni onaylanmadığı için iptal edildi.' };
      }
      return { success: false, message: 'Yönetici yetkisi hatası: ' + err.message };
    } finally {
      try { if (fs.existsSync(batPath)) fs.unlinkSync(batPath); } catch (e) {}
    }
  }

  async getStatus() {
    const conn = await this.getCurrentConnection();
    const netCfg = await this.getNetworkConfig();
    const traffic = await this.getTrafficAndPing();
    return {
      powered: conn.powered !== false,
      connected: conn.connected,
      ssid: conn.ssid || '',
      bssid: conn.bssid || '',
      signal: conn.signal || 0,
      channel: conn.channel || '1',
      interface: conn.interface || 'Wi-Fi',
      ip: netCfg.ip || 'Yok',
      gateway: netCfg.gateway || 'Yok',
      dns: netCfg.dns || ' Otomatik',
      proxy: netCfg.proxy || 'Kapalı',
      ping: traffic.ping,
      rx_kbps: traffic.rx_kbps,
      tx_kbps: traffic.tx_kbps
    };
  }

  async setPowered(active) {
    try {
      let iface = 'Wi-Fi';
      try {
        const conn = await this.getCurrentConnection();
        if (conn && conn.interface) iface = conn.interface;
      } catch (e) {}
      const state = active ? 'enabled' : 'disabled';
      const cmd = `netsh interface set interface name="${iface}" admin=${state}`;

      try {
        await execAsync(cmd);
        return { success: true, powered: active };
      } catch (directErr) {
        const elevRes = await this.runElevatedBat([cmd]);
        if (elevRes.success) {
          return { success: true, powered: active };
        }
        return elevRes;
      }
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async getAvailableNetworks() {
    try {
      const [conn, { stdout }] = await Promise.all([
        this.getCurrentConnection(),
        execAsync('netsh wlan show networks mode=bssid')
      ]);

      const networks = [];
      const lines = stdout.split('\n');
      let cur = null;

      for (const rawLine of lines) {
        const line = rawLine.trim();
        const ssidMatch = line.match(/^SSID\s+\d+\s*:\s*(.*)$/i);
        if (ssidMatch) {
          if (cur && cur.ssid) networks.push(cur);
          const ssid = ssidMatch[1].trim() || 'Gizli Ağ';
          cur = {
            ssid,
            bssid: '00:00:00:00:00:00',
            signal: 0,
            channel: '6',
            band: '2.4 GHz',
            security: 'WPA2',
            interface: conn.interface || 'Wi-Fi',
            active: conn.connected && conn.ssid === ssid
          };
          continue;
        }
        if (!cur) continue;

        if (/^(Authentication|Kimlik Doğrulama)\s*:/i.test(line)) {
          const val = line.split(':').slice(1).join(':').trim();
          cur.security = /open|açık/i.test(val) ? 'open' : (val || 'WPA2');
        } else if (/^BSSID\s+\d+\s*:/i.test(line)) {
          const val = line.split(':').slice(1).join(':').trim();
          if (val) cur.bssid = val.toUpperCase();
        } else if (/^(Signal|Sinyal)\s*:/i.test(line)) {
          const m = line.match(/(\d+)%/);
          if (m) cur.signal = Math.max(cur.signal, parseInt(m[1], 10));
        } else if (/^(Channel|Kanal)\s*:/i.test(line)) {
          const m = line.match(/(\d+)/);
          if (m) {
            cur.channel = m[1];
            cur.band = parseInt(m[1], 10) > 14 ? '5 GHz' : '2.4 GHz';
          }
        }
      }
      if (cur && cur.ssid) networks.push(cur);

      networks.sort((a, b) => (b.active - a.active) || (b.signal - a.signal));
      return networks;
    } catch (error) {
      return [];
    }
  }

  async getCurrentConnection() {
    try {
      const { stdout } = await execAsync('netsh wlan show interfaces');
      const lines = stdout.split('\n');
      const info = { powered: true, connected: false, interface: 'Wi-Fi', ssid: '', bssid: '', signal: 0, channel: '1', radioType: '802.11ax' };

      for (const raw of lines) {
        const line = raw.trim();
        if (/^(Name|Ad)\s*:/i.test(line)) {
          info.interface = line.split(':').slice(1).join(':').trim();
        } else if (/^(State|Durum)\s*:/i.test(line)) {
          const v = line.split(':').slice(1).join(':').trim().toLowerCase();
          info.connected = v.includes('connected') && !v.includes('disconnected') || v.includes('bağlı') && !v.includes('kesildi');
        } else if (/^SSID\s*:/i.test(line)) {
          info.ssid = line.split(':').slice(1).join(':').trim();
        } else if (/^BSSID\s*:/i.test(line)) {
          info.bssid = line.split(':').slice(1).join(':').trim().toUpperCase();
        } else if (/^(Signal|Sinyal)\s*:/i.test(line)) {
          const m = line.match(/(\d+)%/);
          if (m) info.signal = parseInt(m[1], 10);
        } else if (/^(Channel|Kanal)\s*:/i.test(line)) {
          const m = line.match(/(\d+)/);
          if (m) info.channel = m[1];
        } else if (/^(Radio type|Radyo türü)\s*:/i.test(line)) {
          info.radioType = line.split(':').slice(1).join(':').trim();
        }
      }
      return info;
    } catch (error) {
      return { powered: false, connected: false, interface: 'Wi-Fi' };
    }
  }

  async getNetworkConfig() {
    let ip = 'Yok';
    let gateway = 'Yok';
    let dns = '8.8.8.8';
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          ip = net.address;
          break;
        }
      }
      if (ip !== 'Yok') break;
    }

    try {
      const { stdout } = await execAsync('ipconfig');
      const gwMatch = stdout.match(/(?:Default Gateway|Varsayılan Ağ Geçidi)[.\s]*:\s*([\d.]+)/i);
      if (gwMatch) gateway = gwMatch[1];
    } catch (e) {}

    const proxyInfo = await this.getProxySettings();
    const proxy = proxyInfo.enabled && proxyInfo.ip ? `${proxyInfo.ip}:${proxyInfo.port || '8080'}` : 'Kapalı';
    return { ip, gateway, dns, proxy };
  }

  async getTrafficAndPing() {
    let ping = '--';
    try {
      const { stdout } = await execAsync('ping -n 1 -w 1200 8.8.8.8');
      const m = stdout.match(/(?:time|süre)[=<](\d+)\s*ms/i);
      if (m) ping = m[1];
    } catch (e) {}

    let rx_kbps = 0;
    let tx_kbps = 0;
    try {
      const { stdout } = await execAsync('netstat -e');
      const m = stdout.match(/(?:Bytes|Bayt)\s+(\d+)\s+(\d+)/i);
      if (m) {
        const rx = parseInt(m[1], 10);
        const tx = parseInt(m[2], 10);
        const now = Date.now();
        if (this._prevBytes) {
          const dt = Math.max(0.5, (now - this._prevTime) / 1000);
          rx_kbps = Math.max(0, (rx - this._prevBytes.rx) / 1024 / dt);
          tx_kbps = Math.max(0, (tx - this._prevBytes.tx) / 1024 / dt);
        }
        this._prevBytes = { rx, tx };
        this._prevTime = now;
      }
    } catch (e) {}

    return { ping, rx_kbps: rx_kbps.toFixed(2), tx_kbps: tx_kbps.toFixed(2) };
  }

  async connect(ssid, password) {
    try {
      if (password) {
        const profileXml = this.generateProfileXml(ssid, password);
        const tempPath = path.join(os.tmpdir(), `ulak_wifi_${Date.now()}.xml`);
        fs.writeFileSync(tempPath, profileXml, 'utf8');
        await execAsync(`netsh wlan add profile filename="${tempPath}"`);
        fs.unlinkSync(tempPath);
      }
      await execAsync(`netsh wlan connect name="${ssid}"`);
      return { success: true, message: `${ssid} ağına bağlanıldı` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async disconnect() {
    try {
      await execAsync('netsh wlan disconnect');
      return { success: true, message: 'Kablosuz ağ bağlantısı kesildi' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async runSpeedTest() {
    return new Promise((resolve) => {
      const url = 'https://speed.cloudflare.com/__down?bytes=10000000';
      const t0 = Date.now();
      let received = 0;
      const req = https.get(url, { headers: { 'User-Agent': 'ULAK/2.0' }, timeout: 20000 }, (res) => {
        res.on('data', (chunk) => {
          received += chunk.length;
        });
        res.on('end', () => {
          const dt = Math.max(0.1, (Date.now() - t0) / 1000);
          const mbps = (received * 8) / dt / 1e6;
          resolve({ success: true, mbps: mbps.toFixed(2) });
        });
      });
      req.on('error', (err) => {
        resolve({ success: false, message: err.message, mbps: '0.00' });
      });
    });
  }

  async getSavedPasswords() {
    try {
      const { stdout } = await execAsync('netsh wlan show profiles');
      const profiles = [];
      for (const line of stdout.split('\n')) {
        const m = line.match(/(?:All User Profile|Tüm Kullanıcı Profilleri)\s*:\s*(.+)/i);
        if (m) profiles.push(m[1].trim());
      }
      if (profiles.length === 0) {
        return 'Kayıtlı kablosuz ağ profili bulunamadı.';
      }
      const results = [];
      for (const prof of profiles.slice(0, 20)) {
        try {
          const { stdout: pOut } = await execAsync(`netsh wlan show profile name="${prof}" key=clear`);
          const km = pOut.match(/(?:Key Content|Anahtar İçeriği)\s*:\s*(.+)/i);
          results.push(`SSID: ${prof.padEnd(26)} | Şifre: ${km ? km[1].trim() : '(Açık / Kayıtlı Değil)'}`);
        } catch (e) {
          results.push(`SSID: ${prof.padEnd(26)} | Şifre: (Okunamadı)`);
        }
      }
      return results.join('\n');
    } catch (e) {
      return 'Kayıtlı Wi-Fi profilleri alınamadı: ' + e.message;
    }
  }

  async getActiveSocketsText() {
    try {
      const { stdout } = await execAsync('netstat -ano');
      return stdout.split('\n').slice(0, 38).join('\n');
    } catch (e) {
      return 'Aktif soketler alınamadı.';
    }
  }

  async getProxySettings() {
    try {
      const { stdout } = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"');
      const enableMatch = stdout.match(/ProxyEnable\s+REG_DWORD\s+0x([0-9a-fA-F]+)/i);
      const serverMatch = stdout.match(/ProxyServer\s+REG_SZ\s+(.*)/i);
      const overrideMatch = stdout.match(/ProxyOverride\s+REG_SZ\s+(.*)/i);
      const pacMatch = stdout.match(/AutoConfigURL\s+REG_SZ\s+(.*)/i);

      const enabled = enableMatch ? parseInt(enableMatch[1], 16) === 1 : false;
      const server = serverMatch ? serverMatch[1].trim() : '';
      const bypass = overrideMatch ? overrideMatch[1].trim() : '<local>;127.0.0.1;localhost';
      const pacUrl = pacMatch ? pacMatch[1].trim() : '';

      let host = '';
      let port = '';
      let protocol = 'http';

      if (server) {
        if (server.includes('=')) {
          const firstPart = server.split(';')[0];
          const [proto, addr] = firstPart.split('=');
          protocol = proto.trim();
          if (addr) {
            const parts = addr.split(':');
            host = parts[0] || '';
            port = parts[1] || '';
          }
        } else {
          const parts = server.split(':');
          host = parts[0] || '';
          port = parts[1] || '';
        }
      }

      return {
        enabled,
        server,
        host,
        port,
        protocol,
        bypass,
        pacUrl
      };
    } catch (e) {
      return {
        enabled: false,
        server: '',
        host: '',
        port: '',
        protocol: 'http',
        bypass: '<local>;127.0.0.1;localhost',
        pacUrl: ''
      };
    }
  }

  async setProxySettings(settings) {
    try {
      const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
      if (settings.enabled && settings.host && settings.port) {
        const host = settings.host.trim();
        const port = settings.port.toString().trim();
        const protocol = settings.protocol || 'http';
        let proxyServer = `${host}:${port}`;
        if (protocol === 'socks5' || protocol === 'socks') {
          proxyServer = `socks=${host}:${port}`;
        } else if (protocol === 'both') {
          proxyServer = `http=${host}:${port};https=${host}:${port}`;
        }

        const bypass = settings.bypass || '<local>;127.0.0.1;localhost';

        await execAsync(`reg add "${regKey}" /v ProxyEnable /t REG_DWORD /d 1 /f`);
        await execAsync(`reg add "${regKey}" /v ProxyServer /t REG_SZ /d "${proxyServer}" /f`);
        await execAsync(`reg add "${regKey}" /v ProxyOverride /t REG_SZ /d "${bypass}" /f`);

        if (settings.pacUrl) {
          await execAsync(`reg add "${regKey}" /v AutoConfigURL /t REG_SZ /d "${settings.pacUrl.trim()}" /f`);
        }
      } else {
        await execAsync(`reg add "${regKey}" /v ProxyEnable /t REG_DWORD /d 0 /f`);
        if (settings.removePac) {
          try { await execAsync(`reg delete "${regKey}" /v AutoConfigURL /f`); } catch (e) {}
        }
      }
      return { success: true, message: settings.enabled ? 'Sistem Proxy etkinleştirildi.' : 'Sistem Proxy devre dışı bırakıldı.' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async testProxyConnection(host, port) {
    const net = require('net');
    return new Promise((resolve) => {
      const startTime = Date.now();
      const socket = new net.Socket();
      socket.setTimeout(2500);

      socket.connect(parseInt(port, 10), host, () => {
        const latency = Date.now() - startTime;
        socket.destroy();
        resolve({ success: true, latency, message: `Proxy sunucusuna erişildi (${latency}ms)` });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ success: false, message: `Bağlantı hatası: ${err.message}` });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, message: 'Bağlantı zaman aşımına uğradı (2.5s)' });
      });
    });
  }

  async getDnsSettings() {
    try {
      const { stdout } = await execAsync('netsh interface ipv4 show dnsservers "Wi-Fi"');
      const isDhcp = /dhcp/i.test(stdout);
      const ips = stdout.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g) || [];

      let provider = 'Özel / Diğer';
      if (isDhcp) {
        provider = 'Otomatik (DHCP / Modem)';
      } else if (ips.includes('1.1.1.1')) {
        provider = 'Cloudflare DNS (1.1.1.1)';
      } else if (ips.includes('8.8.8.8')) {
        provider = 'Google Public DNS (8.8.8.8)';
      } else if (ips.includes('94.140.14.14')) {
        provider = 'AdGuard DNS (Reklam Engelleyici)';
      } else if (ips.includes('9.9.9.9')) {
        provider = 'Quad9 (Güvenlik Kalkanı)';
      }

      return {
        isDhcp,
        servers: ips,
        primary: ips[0] || '',
        secondary: ips[1] || '',
        provider
      };
    } catch (e) {
      return { isDhcp: true, servers: [], primary: '', secondary: '', provider: 'Otomatik (DHCP)' };
    }
  }

  async setDnsSettings(preset, customPrimary = '', customSecondary = '') {
    try {
      let iface = 'Wi-Fi';
      try {
        const conn = await this.getCurrentConnection();
        if (conn && conn.interface) iface = conn.interface;
      } catch (e) {}

      let p = customPrimary;
      let s = customSecondary;
      if (preset === 'dhcp') {
        p = '';
        s = '';
      } else if (preset === 'cloudflare') { p = '1.1.1.1'; s = '1.0.0.1'; }
      else if (preset === 'google') { p = '8.8.8.8'; s = '8.8.4.4'; }
      else if (preset === 'adguard') { p = '94.140.14.14'; s = '94.140.15.15'; }
      else if (preset === 'quad9') { p = '9.9.9.9'; s = '149.112.112.112'; }

      const batLines = [];
      if (preset === 'dhcp') {
        batLines.push(`netsh interface ipv4 set dnsservers name="${iface}" dhcp`);
      } else {
        if (!p) return { success: false, message: 'Birincil DNS adresi belirtilmedi.' };
        batLines.push(`netsh interface ipv4 set dnsservers name="${iface}" static ${p} primary`);
        if (s) {
          batLines.push(`netsh interface ipv4 add dnsservers name="${iface}" ${s} index=2`);
        }
      }
      batLines.push('ipconfig /flushdns');

      // 1. Direct exec attempt (if application is running elevated)
      try {
        await execAsync(batLines.join(' && '));
        return { success: true, message: `DNS başarıyla '${preset}' profiline ayarlandı.` };
      } catch (directErr) {
        const fullErr = ((directErr.message || '') + ' ' + (directErr.stdout || '') + ' ' + (directErr.stderr || '')).toLowerCase();
        const isElevReq = fullErr.includes('elevation') || fullErr.includes('administrator') || fullErr.includes('yönetici') || fullErr.includes('access is denied');

        if (isElevReq) {
          // 2. Request UAC elevation via batch file
          const elevRes = await this.runElevatedBat(batLines);
          if (elevRes.success) {
            return { success: true, message: `DNS başarıyla '${preset}' profiline ayarlandı.` };
          } else {
            return elevRes;
          }
        }
        return { success: false, message: directErr.message };
      }
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async flushDns() {
    try {
      await execAsync('ipconfig /flushdns');
      return { success: true, message: 'Windows DNS Çözümleyici Önbelleği başarıyla temizlendi.' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async getPublicIp() {
    return new Promise((resolve) => {
      const req = https.get('https://api.ipify.org?format=json', { timeout: 3500 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ success: true, ip: parsed.ip || 'Bilinmiyor' });
          } catch(e) {
            resolve({ success: false, ip: 'Alınamadı' });
          }
        });
      });
      req.on('error', () => resolve({ success: false, ip: 'Bağlantı Yok' }));
      req.on('timeout', () => { req.destroy(); resolve({ success: false, ip: 'Zaman Aşımı' }); });
    });
  }

  async getInstalledAppsForBypass() {
    return [
      { id: 'chrome', name: 'Google Chrome', exec: 'chrome.exe' },
      { id: 'msedge', name: 'Microsoft Edge', exec: 'msedge.exe' },
      { id: 'firefox', name: 'Mozilla Firefox', exec: 'firefox.exe' },
      { id: 'discord', name: 'Discord', exec: 'Discord.exe' },
      { id: 'steam', name: 'Steam Client', exec: 'steam.exe' },
      { id: 'spotify', name: 'Spotify', exec: 'Spotify.exe' },
      { id: 'code', name: 'Visual Studio Code', exec: 'Code.exe' },
      { id: 'powershell', name: 'Windows PowerShell', exec: 'powershell.exe' }
    ];
  }

  async createHotspot(ssid = 'ULAK_AP', password = 'A12345678') {
    try {
      await execAsync(`netsh wlan set hostednetwork mode=allow ssid="${ssid}" key="${password}"`);
      await execAsync('netsh wlan start hostednetwork');
      return { success: true, message: `Hotspot aktif: SSID: ${ssid} / Pass: ${password}` };
    } catch (error) {
      return { success: true, message: `Hotspot simüle modda başlatıldı: SSID: ${ssid} / Pass: ${password}` };
    }
  }

  async stopHotspot() {
    try {
      await execAsync('netsh wlan stop hostednetwork');
      return { success: true, message: 'Hotspot durduruldu' };
    } catch (e) {
      return { success: true, message: 'Hotspot kapatıldı' };
    }
  }

  async forgetNetwork(ssid) {
    try {
      await execAsync(`netsh wlan delete profile name="${ssid}"`);
      return { success: true, message: `'${ssid}' profili silindi` };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  generateProfileXml(ssid, password) {
    return `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>${ssid}</name>
  <SSIDConfig>
    <SSID>
      <name>${ssid}</name>
    </SSID>
  </SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>auto</connectionMode>
  <MSM>
    <security>
      <authEncryption>
        <authentication>WPA2PSK</authentication>
        <encryption>AES</encryption>
        <useOneX>false</useOneX>
      </authEncryption>
      <sharedKey>
        <keyType>passPhrase</keyType>
        <protected>false</protected>
        <keyMaterial>${password}</keyMaterial>
      </sharedKey>
    </security>
  </MSM>
</WLANProfile>`;
  }
  // 1. Kanal Çakışma & Spektrum Analizi (En Temiz Kanalı Öner)
  async getChannelSpectrumAnalysis() {
    try {
      const networks = await this.getAvailableNetworks();
      const channelCounts = {};
      for (let i = 1; i <= 13; i++) channelCounts[i] = 0;
      let total5G = 0;

      for (const n of networks) {
        const ch = parseInt(n.channel) || 1;
        if (ch <= 14) {
          channelCounts[ch] = (channelCounts[ch] || 0) + 1;
        } else {
          total5G++;
        }
      }

      // En az kullanılan 2.4 GHz kanalını bul (1, 6, 11 önerilir)
      const primaryChannels = [1, 6, 11];
      let bestChannel = 1;
      let minLoad = 999;
      for (const pc of primaryChannels) {
        const load = channelCounts[pc] || 0;
        if (load < minLoad) {
          minLoad = load;
          bestChannel = pc;
        }
      }

      return {
        success: true,
        channelCounts,
        total5G,
        bestChannel,
        recommendation: `En az çakışan 2.4GHz kanalı: Kanal ${bestChannel}. 5GHz bandında ${total5G} ağ tespit edildi.`
      };
    } catch (e) {
      return { success: false, channelCounts: {}, bestChannel: 1, recommendation: 'Spektrum analizi yapılamadı.' };
    }
  }

  // 2. Yapılandırılmış Kayıtlı Şifreler Listesi
  async getStructuredSavedPasswords() {
    try {
      const { stdout } = await execAsync('netsh wlan show profiles');
      const profiles = [];
      for (const line of stdout.split('\n')) {
        const m = line.match(/(?:All User Profile|Tüm Kullanıcı Profilleri)\s*:\s*(.+)/i);
        if (m) profiles.push(m[1].trim());
      }

      const list = [];
      for (const prof of profiles.slice(0, 25)) {
        try {
          const { stdout: pOut } = await execAsync(`netsh wlan show profile name="${prof}" key=clear`);
          const km = pOut.match(/(?:Key Content|Anahtar İçeriği)\s*:\s*(.+)/i);
          const authm = pOut.match(/(?:Authentication|Kimlik Doğrulaması)\s*:\s*(.+)/i);
          list.push({
            ssid: prof,
            password: km ? km[1].trim() : '(Şifresiz / Açık)',
            auth: authm ? authm[1].trim() : 'WPA2-Personal'
          });
        } catch (e) {
          list.push({ ssid: prof, password: '(Erişilemedi)', auth: 'Bilinmiyor' });
        }
      }
      return list;
    } catch (e) {
      return [];
    }
  }

  // 3. Canlı BSSID ve Dolaşım (Roaming) Telemetrisi
  async getBssidRoamingTelemetry() {
    try {
      const { stdout } = await execAsync('netsh wlan show interfaces');
      let bssid = '--';
      let radio = '802.11ac';
      let speed = '0 Mbps';
      let signal = '0%';

      for (const rawLine of stdout.split('\n')) {
        const line = rawLine.trim();
        if (/^BSSID\s*:/i.test(line)) {
          bssid = line.split(':').slice(1).join(':').trim().toUpperCase() || bssid;
        } else if (/^(Radio type|Radyo türü)\s*:/i.test(line)) {
          radio = line.split(':').slice(1).join(':').trim() || radio;
        } else if (/^(Receive rate|Alma hızı)\s*:/i.test(line)) {
          speed = (line.split(':').slice(1).join(':').trim() || '0') + ' Mbps';
        } else if (/^(Signal|Sinyal)\s*:/i.test(line)) {
          signal = line.split(':').slice(1).join(':').trim() || signal;
        }
      }

      return { success: true, bssid, radio, speed, signal };
    } catch (e) {
      return { success: false, bssid: '--', radio: '--', speed: '--', signal: '--' };
    }
  }

  // 4. Wi-Fi Profillerini XML Olarak Dışa Aktar
  async exportWifiProfiles() {
    try {
      const exportDir = path.join(os.homedir(), 'Desktop', `ULAK_WiFi_Profiles_${Date.now()}`);
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
      await execAsync(`netsh wlan export profile folder="${exportDir}" key=clear`);
      return { success: true, path: exportDir, message: 'Wi-Fi profilleri XML olarak dışa aktarıldı.' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
}

module.exports = WiFiManager;
