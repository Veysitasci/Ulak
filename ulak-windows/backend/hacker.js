const { exec } = require('child_process');
const { promisify } = require('util');
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
          return stdout || 'Arayüz bilgisi alınamadı.';
        }
        case 'routes': {
          const { stdout } = await execAsync('route print');
          return stdout || 'Route bilgisi alınamadı.';
        }
        case 'dns': {
          const { stdout } = await execAsync('ipconfig /displaydns');
          return stdout.slice(0, 8000) || 'DNS kaydı bulunamadı.';
        }
        case 'security_log': {
          try {
            const { stdout } = await execAsync('wevtutil qe System /c:30 /rd:true /f:text /q:"*[System[(Level=1 or Level=2 or Level=3)]]"');
            return stdout || 'Güvenlik uyarısı bulunamadı.';
          } catch (e) {
            return 'Olay günlüğü okunamadı: ' + e.message;
          }
        }
        case 'mac_changer': {
          const { stdout } = await execAsync('getmac /v /fo list');
          return stdout || 'MAC bilgisi bulunamadı.';
        }
        case 'arp_table': {
          const { stdout } = await execAsync('arp -a');
          return stdout || 'ARP tablosu boş.';
        }
        case 'ssl_check': {
          return await new Promise((resolve) => {
            const socket = tls.connect(443, 'google.com', { servername: 'google.com', timeout: 5000 }, () => {
              const cert = socket.getPeerCertificate();
              if (cert && Object.keys(cert).length > 0) {
                const info = [
                  `Konu: ${JSON.stringify(cert.subject)}`,
                  `Yayıncı: ${JSON.stringify(cert.issuer)}`,
                  `Başlangıç: ${cert.valid_from}`,
                  `Bitiş: ${cert.valid_to}`,
                  `Parmak İzi: ${cert.fingerprint256 || cert.fingerprint}`,
                  `Protokol: ${socket.getProtocol()}`
                ].join('\n');
                socket.end();
                resolve(info);
              } else {
                socket.end();
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
}

module.exports = HackerTools;
