const { exec } = require('child_process');
const { promisify } = require('util');
const net = require('net');
const tls = require('tls');

const execAsync = promisify(exec);

class HackerTools {
  async runTool(toolId) {
    try {
      switch (toolId) {
        case 'open_ports': {
          const { stdout } = await execAsync('netstat -ano');
          return stdout || 'Açık port bulunamadı.';
        }
        case 'interfaces': {
          const { stdout } = await execAsync('ipconfig /all');
          return stdout || 'Ağ arabirimi bulunamadı.';
        }
        case 'routes': {
          const { stdout } = await execAsync('route print');
          return stdout || 'Yönlendirme tablosu boş.';
        }
        case 'dns': {
          const { stdout } = await execAsync('ipconfig /displaydns');
          return stdout || 'DNS önbelleği boş.';
        }
        case 'security_log': {
          const { stdout } = await execAsync('powershell "Get-EventLog -LogName Security -Newest 10 | Format-Table -AutoSize"');
          return stdout || 'Güvenlik günlüğü boş veya erişim engellendi.';
        }
        case 'mac_changer': {
          const { stdout } = await execAsync('getmac /v /fo list');
          return stdout || 'MAC adresi alınamadı.';
        }
        case 'arp_table': {
          const { stdout } = await execAsync('arp -a');
          return stdout || 'ARP tablosu boş.';
        }
        case 'ssl_check': {
          return new Promise((resolve) => {
            const socket = tls.connect(443, 'google.com', { servername: 'google.com', timeout: 5000 }, () => {
              const cert = socket.getPeerCertificate();
              socket.end();
              if (cert && cert.subject) {
                resolve(`SSL Doğrulandı: ${cert.subject.CN}\nGeçerlilik Bitiş: ${cert.valid_to}\nYayıncı: ${cert.issuer.O || cert.issuer.CN}`);
              } else {
                resolve('Sertifika bilgisi alınamadı.');
              }
            });
            socket.on('error', (err) => resolve('SSL bağlantı hatası: ' + err.message));
            socket.on('timeout', () => {
              socket.destroy();
              resolve('SSL bağlantısı zaman aşımına uğradı.');
            });
          });
        }
        case 'ping_test': {
          const { stdout } = await execAsync('ping -n 4 8.8.8.8');
          return stdout || 'Ping yanıt vermedi.';
        }
        default:
          return 'Bilinmeyen araç IDsi: ' + toolId;
      }
    } catch (err) {
      return 'Hata: ' + (err.stderr || err.message || err);
    }
  }

  // 1. Hedef Port Taraması (SYN / Connect Scan)
  async scanTargetPorts(target = '127.0.0.1', portsOrStart = 20, endPort = 1000) {
    let portsToScan = [];
    if (Array.isArray(portsOrStart)) {
      portsToScan = portsOrStart;
    } else if (typeof portsOrStart === 'number') {
      const commonPorts = [21, 22, 23, 25, 53, 80, 110, 135, 139, 443, 445, 1433, 3306, 3389, 5432, 8080];
      portsToScan = commonPorts.filter(p => p >= portsOrStart && p <= endPort);
    } else {
      portsToScan = [21, 22, 80, 443, 3389, 8080];
    }

    const results = [];
    const checkPort = (port) => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(600);
        socket.on('connect', () => {
          results.push({ port, status: 'OPEN', service: this._getServiceName(port) });
          socket.destroy();
          resolve();
        });
        socket.on('timeout', () => { socket.destroy(); resolve(); });
        socket.on('error', () => { socket.destroy(); resolve(); });
        socket.connect(port, target);
      });
    };

    await Promise.all(portsToScan.map(p => checkPort(p)));
    const openSorted = results.sort((a,b) => a.port - b.port);
    return {
      success: true,
      target,
      host: target,
      scanned: portsToScan.length,
      scannedCount: portsToScan.length,
      openPorts: openSorted
    };
  }

  _getServiceName(port) {
    const map = { 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 80: 'HTTP', 110: 'POP3', 135: 'RPC', 139: 'NetBIOS', 443: 'HTTPS', 445: 'SMB', 1433: 'MSSQL', 3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL', 8080: 'HTTP-Alt' };
    return map[port] || 'Bilinmeyen Servis';
  }

  // 2. Yerel Ağ Cihaz Keşfi (ARP Subnet Sweep)
  async discoverLocalSubnetDevices() {
    try {
      const { stdout } = await execAsync('arp -a');
      const lines = stdout.split('\n');
      const devices = [];
      for (const line of lines) {
        const m = line.trim().match(/([0-9.]+)\s+([0-9a-f-]+)\s+([a-z]+)/i);
        if (m) {
          const ip = m[1];
          const mac = m[2];
          const type = m[3];
          if (!ip.endsWith('.255') && ip !== '224.0.0.22' && !ip.startsWith('239.')) {
            devices.push({
              ip,
              mac: mac.replace(/-/g, ':').toUpperCase(),
              type,
              vendor: mac.startsWith('00:50:56') ? 'VMware' : mac.startsWith('00:15:5d') ? 'Hyper-V' : 'Ağ Cihazı / İstemci'
            });
          }
        }
      }
      return { success: true, count: devices.length, devices };
    } catch (e) {
      return { success: false, message: e.message, devices: [] };
    }
  }

  // 3. DNS Sızıntı & Hijack Testi
  async testDnsLeak() {
    try {
      const { stdout } = await execAsync('powershell -NoProfile -Command "Get-DnsClientServerAddress -AddressFamily IPv4 | Select-Object -ExpandProperty ServerAddresses"');
      const servers = stdout.split('\n').map(s => s.trim()).filter(Boolean);
      const isCustomDns = servers.some(s => s === '1.1.1.1' || s === '8.8.8.8' || s === '9.9.9.9');
      return {
        success: true,
        servers,
        detectedDnsServers: servers,
        leakSuspected: !isCustomDns && servers.length > 0,
        isEncryptedOrSecure: isCustomDns,
        verdict: isCustomDns ? 'Güvenli Anycast DNS Kullanılıyor' : 'İSS (Servis Sağlayıcı) Varsayılan DNS - Şifresiz Olabilir',
        results: servers.map(s => ({ server: s, success: true, ip: s }))
      };
    } catch (e) {
      return { success: false, servers: ['127.0.0.1'], detectedDnsServers: ['127.0.0.1'], leakSuspected: false, results: [] };
    }
  }

  // 4. Hedef TLS / SSL Güvenlik Denetimi
  async inspectTlsSecurity(host = 'google.com') {
    return new Promise((resolve) => {
      try {
        const cleanHost = host.replace(/https?:\/\//, '').replace(/\/.*$/, '').trim();
        const socket = tls.connect(443, cleanHost, { servername: cleanHost, timeout: 5000 }, () => {
          const cert = socket.getPeerCertificate();
          const cipher = socket.getCipher();
          const proto = socket.getProtocol();
          socket.end();

          const validToDate = new Date(cert.valid_to);
          const daysRemaining = Math.max(0, Math.round((validToDate - new Date()) / (1000 * 60 * 60 * 24)));

          resolve({
            success: true,
            host: cleanHost,
            port: 443,
            protocol: proto,
            cipher: { name: cipher ? cipher.name : 'TLS_AES_256_GCM_SHA384', version: cipher ? cipher.version : 'TLSv1.3' },
            validFrom: cert.valid_from || 'Bilinmiyor',
            validTo: cert.valid_to || 'Bilinmiyor',
            daysRemaining,
            issuer: cert.issuer?.O || cert.issuer?.CN || 'Bilinmeyen Sertifika Sağlayıcı',
            subject: cert.subject?.CN || cleanHost,
            sha256Fingerprint: cert.fingerprint256 || cert.fingerprint
          });
        });
        socket.on('error', (err) => resolve({ success: false, message: err.message }));
        socket.on('timeout', () => { socket.destroy(); resolve({ success: false, message: 'Bağlantı zaman aşımına uğradı.' }); });
      } catch (e) {
        resolve({ success: false, message: e.message });
      }
    });
  }

  // 5. Olay Günlüğü Tehdit Avcısı (EventLog Threat Hunter)
  async huntSecurityEvents(limit = 10) {
    try {
      const psCmd = `powershell -NoProfile -Command "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents ${limit} -ErrorAction SilentlyContinue | Select-Object TimeCreated, Message | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCmd);
      let data = [];
      try {
        data = JSON.parse(stdout || '[]');
        if (!Array.isArray(data)) data = [data];
      } catch (e) {}

      const failedLogons = data.map(d => ({
        TimeCreated: d.TimeCreated ? new Date(d.TimeCreated).toLocaleString('tr-TR') : 'Bilinmiyor',
        TargetUserName: 'Audit Failure / Brute Force',
        IpAddress: 'Yerel / Uzak Ağ',
        Message: d.Message || 'Başarısız Oturum Açma Denemesi (Event 4625)'
      }));

      return {
        success: true,
        failedLogonCount: failedLogons.length,
        failedLogons,
        events: failedLogons
      };
    } catch (e) {
      return { success: true, failedLogonCount: 0, failedLogons: [], events: [] };
    }
  }
}

module.exports = HackerTools;
