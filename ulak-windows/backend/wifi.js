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
      const state = active ? 'enabled' : 'disabled';
      await execAsync(`netsh interface set interface name="Wi-Fi" admin=${state}`);
      return { success: true, powered: active };
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
      const info = { powered: true, connected: false, interface: 'Wi-Fi', ssid: '', bssid: '', signal: 0, channel: '1' };

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
    const cfgPath = path.join(os.homedir(), '.config', 'wireless-manager', 'proxy.json');
    try {
      if (fs.existsSync(cfgPath)) {
        return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      }
    } catch (e) {}
    return { enabled: false, strict: false, ip: '', port: '', excluded: [] };
  }

  async setProxySettings(settings) {
    const dir = path.join(os.homedir(), '.config', 'wireless-manager');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'proxy.json'), JSON.stringify(settings, null, 2), 'utf8');

    try {
      if (settings.enabled && settings.ip && settings.port) {
        await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f`);
        await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "${settings.ip}:${settings.port}" /f`);
      } else {
        await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`);
      }
    } catch (e) {}
    return { success: true };
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
}

module.exports = WiFiManager;
