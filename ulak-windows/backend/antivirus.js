const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class AntivirusEngine {
  constructor() {
    this.quarantineDir = path.join(os.homedir(), '.ulak', 'quarantine');
    this.quarantineManifest = path.join(this.quarantineDir, 'manifest.json');
    this.ensureQuarantineDir();
  }

  ensureQuarantineDir() {
    try {
      if (!fs.existsSync(this.quarantineDir)) {
        fs.mkdirSync(this.quarantineDir, { recursive: true });
      }
      if (!fs.existsSync(this.quarantineManifest)) {
        fs.writeFileSync(this.quarantineManifest, JSON.stringify([], null, 2), 'utf8');
      }
    } catch (e) {
      console.error('Karantina dizini oluşturulamadı:', e.message);
    }
  }

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

  // 1. Gelişmiş Dosya & Heuristik Taraması (Entropy, Hashes, Format, Signatures)
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

      // Kriptografik Hashler (MD5 & SHA-256)
      const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
      const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Magic Bytes Analizi
      if (buffer.length >= 8 && buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        detectedFormat = 'PNG Görseli';
        const chunks = [];
        let offset = 8;
        let trailingBytes = 0;

        while (offset + 8 <= buffer.length) {
          const length = buffer.readUInt32BE(offset);
          const type = buffer.slice(offset + 4, offset + 8).toString('ascii');
          chunks.push(type);
          offset += 8 + length + 4;
          if (type === 'IEND') {
            trailingBytes = buffer.length - offset;
            break;
          }
        }
        chunksOrSegments = chunks.slice(0, 8).join(' ➔ ') + (chunks.length > 8 ? ` (+${chunks.length - 8})` : '');
        if (trailingBytes > 0) {
          threats.push({
            severity: 'Yüksek',
            description: `IEND bitiş baytı sonrasında ${trailingBytes} bayt gizlenmiş veri (steganografi / trailing payload) bulundu!`
          });
        }
      } else if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        detectedFormat = 'JPEG Görseli';
        const markers = [];
        let offset = 2;
        let trailingBytes = 0;

        while (offset < buffer.length - 1) {
          if (buffer[offset] === 0xff) {
            const m = buffer[offset + 1];
            if (m === 0xd9) { // EOI
              markers.push('EOI');
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
            description: `EOI sonrasında ${trailingBytes} bayt eklenmiş veri bulundu!`
          });
        }
      } else if (buffer.slice(0, 2).toString('ascii') === 'MZ') {
        detectedFormat = 'Windows Çalıştırılabilir (PE / EXE / DLL)';
        chunksOrSegments = 'PE Başlığı & Bölümleri';
      } else if (buffer.slice(0, 4).toString('ascii') === '%PDF') {
        detectedFormat = 'PDF Belgesi';
        chunksOrSegments = 'PDF Başlığı';
      } else if (buffer.slice(0, 2).toString('ascii') === 'BM') {
        detectedFormat = 'BMP Görseli';
        chunksOrSegments = 'BMP Başlığı';
      } else if (buffer.slice(0, 3).toString('ascii') === 'GIF') {
        detectedFormat = 'GIF Görseli';
        chunksOrSegments = 'GIF Blokları';
      } else if (buffer.slice(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
        detectedFormat = 'ZIP / Arşiv Dosyası';
        chunksOrSegments = 'PK Arşiv Başlığı';
      }

      // Polyglot check: Dosya gövdesinde gömülü çalıştırılabilir
      if (buffer.length > 64 && detectedFormat !== 'Windows Çalıştırılabilir (PE / EXE / DLL)') {
        const body = buffer.slice(16);
        if (body.includes(Buffer.from('MZ')) || body.includes(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) {
          threats.push({
            severity: 'Kritik',
            description: 'Dosya içerisine enjekte edilmiş gizli çalıştırılabilir kod (MZ/ELF ikilisi) tespit edildi!'
          });
        }
      }

      // Şüpheli Komut & Webshell Kalıpları
      const textContent = buffer.toString('utf-8', 0, Math.min(buffer.length, 500000));
      const patterns = [
        { regex: /eval\s*\(\s*(base64_decode|gzinflate|\$_POST|\$_GET)/i, sev: 'Kritik', desc: 'PHP eval/base64 webshell kalıbı' },
        { regex: /powershell(\.exe)?\s+(-(enc|encodedcommand)|-(e|nop|w\s+hidden))/i, sev: 'Kritik', desc: 'Gizli PowerShell kod yürütme parametresi' },
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
        md5: md5Hash,
        sha256: sha256Hash,
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

  // 2. Windows Defender Canlı Durumu
  async getDefenderStatus() {
    try {
      const psCmd = `powershell -NoProfile -Command "Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled, AntivirusEnabled, AntispywareEnabled, BehaviorMonitorEnabled, IoavProtectionEnabled, AMServiceEnabled, NISSignatureVersion, AntivirusSignatureAge | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCmd);
      const data = JSON.parse(stdout || '{}');

      return {
        success: true,
        realTimeProtection: data.RealTimeProtectionEnabled === true,
        antivirusEnabled: data.AntivirusEnabled === true,
        behaviorMonitor: data.BehaviorMonitorEnabled === true,
        ioavProtection: data.IoavProtectionEnabled === true,
        serviceActive: data.AMServiceEnabled === true,
        signatureVersion: data.NISSignatureVersion || 'Güncel',
        signatureAgeDays: data.AntivirusSignatureAge !== undefined ? data.AntivirusSignatureAge : 0
      };
    } catch (e) {
      return {
        success: false,
        realTimeProtection: true,
        antivirusEnabled: true,
        behaviorMonitor: true,
        serviceActive: true,
        signatureVersion: 'Standart',
        signatureAgeDays: 0,
        message: e.message
      };
    }
  }

  // 3. Hızlı Sistem Taraması (Windows Defender Quick Scan)
  async runDefenderQuickScan() {
    try {
      const psCmd = `powershell -NoProfile -Command "Start-MpScan -ScanType QuickScan"`;
      await execAsync(psCmd);
      return { success: true, message: 'Windows Defender Hızlı Sistem Taraması başarıyla tamamlandı.' };
    } catch (e) {
      return { success: false, message: 'Tarama başlatılamadı veya yönetici izni gerekiyor: ' + e.message };
    }
  }

  // 4. Güvenli Dosya Parçalayıcı (DoD 5220.22-M 3-Pass Secure File Shredder)
  async shredFile(filePath, passes = 3) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'Parçalanacak dosya bulunamadı.' };
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const fd = fs.openSync(filePath, 'r+');

      for (let p = 1; p <= passes; p++) {
        let pattern;
        if (p === 1) {
          // Pass 1: Random bytes
          pattern = crypto.randomBytes(Math.min(fileSize, 65536));
        } else if (p === 2) {
          // Pass 2: Inverted bytes (0xFF)
          pattern = Buffer.alloc(Math.min(fileSize, 65536), 0xff);
        } else {
          // Pass 3: Zeros (0x00)
          pattern = Buffer.alloc(Math.min(fileSize, 65536), 0x00);
        }

        let written = 0;
        while (written < fileSize) {
          const chunk = Math.min(pattern.length, fileSize - written);
          fs.writeSync(fd, pattern, 0, chunk, written);
          written += chunk;
        }
        fs.fsyncSync(fd);
      }

      fs.closeSync(fd);

      // İsmi ve uzantıyı rastgele baytlarla boz
      const dir = path.dirname(filePath);
      const scrambledName = path.join(dir, `shred_${Date.now()}_${Math.random().toString(36).substring(7)}.tmp`);
      fs.renameSync(filePath, scrambledName);
      fs.unlinkSync(scrambledName);

      return {
        success: true,
        message: `'${path.basename(filePath)}' dosyası ${passes} aşamalı DoD standardında kalıcı olarak parçalandı ve yok edildi.`
      };
    } catch (e) {
      return { success: false, message: 'Dosya parçalama hatası: ' + e.message };
    }
  }

  // 5. Karantina Kasası (Güvenli Şifreleme ve İzolasyon)
  async quarantineFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'Dosya bulunamadı.' };
      }

      this.ensureQuarantineDir();
      const fileName = path.basename(filePath);
      const stat = fs.statSync(filePath);
      const id = 'q_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      const quarantinedFileName = id + '.ulak_quarantine';
      const targetPath = path.join(this.quarantineDir, quarantinedFileName);

      // Basit XOR/AES şifreleme ile dosyayı çalıştırılamaz hale getir
      const buffer = fs.readFileSync(filePath);
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= 0x5a; // XOR scrambling
      }
      fs.writeFileSync(targetPath, buffer);
      fs.unlinkSync(filePath); // Orijinal dosyayı kaldır

      // Manifest dosyasını güncelle
      const manifest = JSON.parse(fs.readFileSync(this.quarantineManifest, 'utf8') || '[]');
      manifest.unshift({
        id,
        originalName: fileName,
        originalPath: filePath,
        fileSize: stat.size,
        quarantineDate: new Date().toLocaleString('tr-TR'),
        quarantinedFile: quarantinedFileName
      });
      fs.writeFileSync(this.quarantineManifest, JSON.stringify(manifest, null, 2), 'utf8');

      return {
        success: true,
        id,
        message: `'${fileName}' başarıyla karantinaya alındı ve izole edildi.`
      };
    } catch (e) {
      return { success: false, message: 'Karantina hatası: ' + e.message };
    }
  }

  getQuarantineList() {
    try {
      this.ensureQuarantineDir();
      return JSON.parse(fs.readFileSync(this.quarantineManifest, 'utf8') || '[]');
    } catch (e) {
      return [];
    }
  }

  restoreQuarantineFile(id) {
    try {
      const manifest = JSON.parse(fs.readFileSync(this.quarantineManifest, 'utf8') || '[]');
      const itemIndex = manifest.findIndex(m => m.id === id);
      if (itemIndex === -1) return { success: false, message: 'Karantina kaydı bulunamadı.' };

      const item = manifest[itemIndex];
      const targetPath = path.join(this.quarantineDir, item.quarantinedFile);

      if (!fs.existsSync(targetPath)) {
        return { success: false, message: 'Karantina fiziksel dosyası kayıp.' };
      }

      const buffer = fs.readFileSync(targetPath);
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= 0x5a; // XOR descramble
      }

      fs.writeFileSync(item.originalPath, buffer);
      fs.unlinkSync(targetPath);

      manifest.splice(itemIndex, 1);
      fs.writeFileSync(this.quarantineManifest, JSON.stringify(manifest, null, 2), 'utf8');

      return { success: true, message: `'${item.originalName}' orijinal konumuna başarıyla geri yüklendi.` };
    } catch (e) {
      return { success: false, message: 'Geri yükleme hatası: ' + e.message };
    }
  }

  deleteQuarantineFile(id) {
    try {
      const manifest = JSON.parse(fs.readFileSync(this.quarantineManifest, 'utf8') || '[]');
      const itemIndex = manifest.findIndex(m => m.id === id);
      if (itemIndex === -1) return { success: false, message: 'Karantina kaydı bulunamadı.' };

      const item = manifest[itemIndex];
      const targetPath = path.join(this.quarantineDir, item.quarantinedFile);

      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }

      manifest.splice(itemIndex, 1);
      fs.writeFileSync(this.quarantineManifest, JSON.stringify(manifest, null, 2), 'utf8');

      return { success: true, message: 'Karantina dosyası kalıcı olarak silindi.' };
    } catch (e) {
      return { success: false, message: 'Silme hatası: ' + e.message };
    }
  }

  // 6. USB & Çıkarılabilir Disk Tehdit Taraması
  async scanUsbDrives() {
    try {
      const psCmd = `powershell -NoProfile -Command "Get-Volume | Where-Object { $_.DriveType -eq 'Removable' } | Select-Object DriveLetter, FileSystemLabel, Size, SizeRemaining | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCmd);
      let volumes = [];
      try {
        volumes = JSON.parse(stdout || '[]');
        if (!Array.isArray(volumes)) volumes = [volumes];
      } catch (e) {}

      const results = [];
      for (const vol of volumes) {
        if (!vol.DriveLetter) continue;
        const driveRoot = `${vol.DriveLetter}:\\`;
        const threatsFound = [];

        // Autorun.inf ve şüpheli kısayollar denetimi
        const autorunPath = path.join(driveRoot, 'autorun.inf');
        if (fs.existsSync(autorunPath)) {
          threatsFound.push('Şüpheli autorun.inf dosyası mevcut.');
        }

        try {
          const files = fs.readdirSync(driveRoot);
          for (const f of files) {
            const ext = path.extname(f).toLowerCase();
            if (['.vbs', '.js', '.wsf', '.bat', '.cmd'].includes(ext)) {
              threatsFound.push(`Kök dizinde gizlenmiş potansiyel zararlı betik: ${f}`);
            }
          }
        } catch (e) {}

        results.push({
          driveLetter: vol.DriveLetter,
          label: vol.FileSystemLabel || 'USB Sürücü',
          sizeGB: vol.Size ? Math.round(vol.Size / (1024 ** 3)) : 0,
          threats: threatsFound,
          status: threatsFound.length > 0 ? 'Riskli' : 'Temiz'
        });
      }

      return {
        success: true,
        count: results.length,
        drives: results
      };
    } catch (e) {
      return { success: false, message: 'USB tarama hatası: ' + e.message };
    }
  }
}

module.exports = AntivirusEngine;
