const fs = require('fs');
const path = require('path');

class AntivirusEngine {
  calculateEntropy(buffer) {
    if (!buffer || buffer.length === 0) return 0;
    const len = Math.min(buffer.length, 65536);
    const counts = new Array(256).fill(0);
    for (let i = 0; i < len; i++) {
      counts[buffer[i]]++;
    }
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (counts[i] > 0) {
        const p = counts[i] / len;
        entropy -= p * Math.log2(p);
      }
    }
    return Math.round(entropy * 100) / 100;
  }

  scanFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'Dosya bulunamadı.' };
      }

      const stats = fs.statSync(filePath);
      const buffer = fs.readFileSync(filePath);
      const entropy = this.calculateEntropy(buffer);
      const threats = [];
      let detectedFormat = 'Bilinmeyen Format';
      let chunksOrSegments = 'Yok';

      // Detect Magic Bytes
      if (buffer.length >= 8 && buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        detectedFormat = 'PNG Görseli';
        // PNG Chunks dissection
        const chunks = [];
        let offset = 8;
        let hasIEND = false;
        let trailingBytes = 0;

        while (offset + 8 <= buffer.length) {
          const length = buffer.readUInt32BE(offset);
          const type = buffer.slice(offset + 4, offset + 8).toString('ascii');
          chunks.push(type);
          offset += 8 + length + 4; // length + type + data + crc
          if (type === 'IEND') {
            hasIEND = true;
            trailingBytes = buffer.length - offset;
            break;
          }
        }
        chunksOrSegments = chunks.slice(0, 8).join(' ➔ ') + (chunks.length > 8 ? ` (+${chunks.length - 8})` : '');
        if (trailingBytes > 0) {
          threats.push({
            severity: 'Yüksek',
            description: `IEND sonrasında ${trailingBytes} bayt gizlenmiş veri (steganografi / trailing payload) bulundu!`
          });
        }
      } else if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        detectedFormat = 'JPEG Görseli';
        const markers = [];
        let offset = 2;
        let hasEOI = false;
        let trailingBytes = 0;

        while (offset < buffer.length - 1) {
          if (buffer[offset] === 0xff) {
            const m = buffer[offset + 1];
            if (m === 0xd9) { // EOI
              markers.push('EOI');
              hasEOI = true;
              trailingBytes = buffer.length - (offset + 2);
              break;
            } else if (m === 0xe0) markers.push('APP0');
            else if (m === 0xe1) markers.push('APP1');
            else if (m === 0xfe) markers.push('COM');
            else if (m === 0xdb) markers.push('DQT');
            else if (m === 0xc0) markers.push('SOF0');
            else if (m === 0xda) markers.push('SOS');
          }
          offset++;
        }
        chunksOrSegments = markers.slice(0, 8).join(' ➔ ');
        if (trailingBytes > 0) {
          threats.push({
            severity: 'Yüksek',
            description: `EOI sonrasında ${trailingBytes} bayt gizlenmiş veri bulundu!`
          });
        }
      } else if (buffer.slice(0, 4).toString('ascii') === '%PDF') {
        detectedFormat = 'PDF Belgesi';
        chunksOrSegments = 'PDF Başlığı';
      } else if (buffer.slice(0, 2).toString('ascii') === 'BM') {
        detectedFormat = 'BMP Görseli';
        chunksOrSegments = 'BMP Başlığı';
      } else if (buffer.slice(0, 3).toString('ascii') === 'GIF') {
        detectedFormat = 'GIF Görseli';
        chunksOrSegments = 'GIF Blokları';
      }

      // Polyglot check: embedded executable
      if (buffer.length > 64) {
        const body = buffer.slice(16);
        if (body.includes(Buffer.from('MZ')) || body.includes(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) {
          threats.push({
            severity: 'Kritik',
            description: 'Görsel / dosya içine gizlenmiş gömülü çalıştırılabilir dosya (MZ/ELF ikilisi) tespit edildi!'
          });
        }
      }

      // Suspicious patterns (Webshells, reverse shells, powershell payload)
      const textContent = buffer.toString('utf-8', 0, Math.min(buffer.length, 500000));
      const patterns = [
        { regex: /eval\s*\(\s*(base64_decode|gzinflate|\$_POST|\$_GET)/i, sev: 'Kritik', desc: 'PHP eval/base64 webshell kalıbı' },
        { regex: /powershell(\.exe)?\s+(-(enc|encodedcommand)|-(e|nop|w\s+hidden))/i, sev: 'Kritik', desc: 'Şifreli PowerShell kod yürütme kalıbı' },
        { regex: /System\.Net\.WebClient.*DownloadString/i, sev: 'Yüksek', desc: 'PowerShell WebClient indirme betiği' },
        { regex: /IEX\s*\(/i, sev: 'Yüksek', desc: 'Invoke-Expression (IEX) bellekten çalıştırma' },
        { regex: /<script[\s\S]*?>[\s\S]*?<\/script>/i, sev: 'Orta', desc: 'SVG / XML içinde gömülü JavaScript kodu' },
        { regex: /(bash|sh)\s+-i\s+>&\s+\/dev\/tcp/i, sev: 'Kritik', desc: 'Linux / Bash interaktif reverse shell komutu' }
      ];

      for (const p of patterns) {
        if (p.regex.test(textContent)) {
          threats.push({ severity: p.sev, description: p.desc });
        }
      }

      let verdict = 'Temiz — Güvenli Dosya';
      let verdictColor = '#10b981';
      if (threats.some(t => t.severity === 'Kritik')) {
        verdict = 'Kritik Tehdit — Zararlı Kod / Shell Tespit Edildi!';
        verdictColor = '#ef4444';
      } else if (threats.length > 0 || entropy > 7.7) {
        verdict = 'Şüpheli — Detaylı İnceleme Önerilir';
        verdictColor = '#f59e0b';
        if (entropy > 7.7 && threats.length === 0) {
          threats.push({ severity: 'Uyarı', description: `Yüksek entropi (${entropy}): Şifrelenmiş veya sıkıştırılmış zararlı veri olasılığı.` });
        }
      }

      return {
        success: true,
        fileName: path.basename(filePath),
        filePath,
        fileSize: stats.size,
        entropy,
        detectedFormat,
        chunksOrSegments,
        verdict,
        verdictColor,
        threats,
        signaturesFound: threats
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = AntivirusEngine;
