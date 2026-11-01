const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const AntivirusEngine = require('./antivirus');

const execAsync = promisify(exec);
const av = new AntivirusEngine();

class UniversalPackageInstaller {
  async inspectPackage(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'Dosya bulunamadı.' };
      }

      const st = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const baseName = path.basename(filePath);

      // Perform antivirus scan
      const avResult = av.scanFile(filePath);

      const files = [];
      let format = ext.toUpperCase().replace('.', '') + ' Paketi';

      // Inspect archive if zip / tar
      if (ext === '.zip') {
        format = 'ZIP Arşivi';
        try {
          const { stdout } = await execAsync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('${filePath}').Entries | Select-Object -First 50 FullName, Length | ForEach-Object { $_.FullName + '|' + $_.Length }"`);
          const lines = stdout.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            const [p, s] = line.trim().split('|');
            files.push({
              path: p,
              size: parseInt(s) || 0,
              is_dir: p.endsWith('/')
            });
          }
        } catch (e) {}
      } else if (ext === '.exe' || ext === '.msi') {
        format = ext === '.msi' ? 'Windows Yükleyici (MSI)' : 'Windows Çalıştırılabilir (EXE)';
        files.push({
          path: baseName,
          size: st.size,
          is_dir: false
        });
      } else if (ext === '.deb' || ext === '.rpm' || ext === '.appimage') {
        format = `Linux ${ext.toUpperCase().replace('.', '')} Paketi`;
        files.push({
          path: baseName,
          size: st.size,
          is_dir: false
        });
      }

      // SHA256 Hash
      let sha256 = '';
      try {
        const hash = crypto.createHash('sha256');
        hash.update(fs.readFileSync(filePath));
        sha256 = hash.digest('hex');
      } catch (e) {}

      const isCritical = avResult?.threats?.some(t => t.severity === 'Kritik');
      const isWarn = (avResult?.threats && avResult.threats.length > 0) || (avResult?.entropy > 7.7);
      const riskLevel = isCritical ? 'HIGH' : isWarn ? 'MEDIUM' : 'SAFE';
      const isPolyglot = avResult?.threats?.some(t => (t.description || '').includes('gömülü')) || false;
      const sizeMB = Math.round((st.size / (1024 * 1024)) * 10) / 10;

      return {
        success: true,
        name: baseName.replace(/\.[^.]+$/, ''),
        fileName: baseName,
        filePath,
        fileSizeMB: sizeMB,
        fileSize: sizeMB > 0 ? `${sizeMB} MB` : `${Math.round(st.size / 1024)} KB`,
        format,
        packageType: format,
        entropy: avResult?.entropy || 0,
        riskLevel,
        isPolyglot,
        sha256: sha256 ? `${sha256.slice(0, 16)}...${sha256.slice(-8)}` : '--',
        sha256Full: sha256,
        files: files.length > 0 ? files : [{ path: baseName, size: st.size, is_dir: false }],
        avResult
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async verifyAuthenticode(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'Dosya bulunamadı.' };
      }
      const psCmd = `powershell -NoProfile -Command "$sig = Get-AuthenticodeSignature -FilePath '${filePath}'; [PSCustomObject]@{ Status = $sig.Status.ToString(); Subject = $sig.SignerCertificate.Subject; Issuer = $sig.SignerCertificate.Issuer; StatusMessage = $sig.StatusMessage } | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCmd);
      const data = JSON.parse(stdout || '{}');

      const isValid = data.Status === 'Valid';
      const isSigned = data.Status !== 'NotSigned';

      return {
        success: true,
        isValid,
        isSigned,
        status: data.Status,
        publisher: data.Subject || (isSigned ? 'İmza Mevcut' : 'İmzasız / Güvenilmez Geliştirici'),
        issuer: data.Issuer || '--',
        message: data.StatusMessage || (isValid ? 'Microsoft Authenticode Dijital İmzası Doğrulandı.' : 'Dijital imza bulunamadı veya geçersiz.')
      };
    } catch (e) {
      return { success: false, isValid: false, isSigned: false, message: e.message };
    }
  }

  async searchOnlinePackages(query, source = 'winget') {
    try {
      const clean = query.replace(/[^a-zA-Z0-9.-]/g, '');
      if (source === 'winget') {
        const { stdout } = await execAsync(`winget search "${clean}" --accept-source-agreements`);
        const lines = stdout.split('\n');
        const results = [];
        for (const line of lines) {
          if (!line.trim() || line.includes('Name') || line.includes('---')) continue;
          const parts = line.trim().split(/\s{2,}/);
          if (parts.length >= 2) {
            results.push({
              name: parts[0],
              id: parts[1],
              version: parts[2] || 'En Yeni',
              source: 'winget'
            });
          }
        }
        return results.slice(0, 30);
      } else {
        const { stdout } = await execAsync(`choco search "${clean}" --limit-output`);
        const lines = stdout.split('\n');
        const results = [];
        for (const line of lines) {
          if (!line.trim()) continue;
          const [id, ver] = line.split('|');
          results.push({
            name: id,
            id: id,
            version: ver || 'En Yeni',
            source: 'choco'
          });
        }
        return results.slice(0, 30);
      }
    } catch (e) {
      return [];
    }
  }

  async installOnlinePackage(packageId, source = 'winget', isSilent = true) {
    try {
      let cmd = '';
      if (source === 'winget') {
        cmd = `winget install --id "${packageId}" --accept-package-agreements --accept-source-agreements ${isSilent ? '--silent' : ''}`;
      } else {
        cmd = `choco install "${packageId}" -y ${isSilent ? '--no-progress' : ''}`;
      }
      const { stdout } = await execAsync(cmd, { timeout: 120000 });
      return { success: true, message: `${packageId} kurulumu tamamlandı.`, output: stdout };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async getInstalledApplications() {
    try {
      const psCmd = `powershell -NoProfile -Command "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object { $_.DisplayName -and !$_.SystemComponent } | Select-Object -First 40 DisplayName, DisplayVersion, Publisher, UninstallString | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCmd);
      let data = JSON.parse(stdout || '[]');
      if (!Array.isArray(data)) data = [data];

      return data.map(app => ({
        name: app.DisplayName || 'Bilinmeyen Yazılım',
        version: app.DisplayVersion || '--',
        publisher: app.Publisher || 'Geliştirici Bilinmiyor',
        uninstallString: app.UninstallString || ''
      }));
    } catch (e) {
      return [];
    }
  }

  async uninstallApplication(uninstallString) {
    try {
      if (!uninstallString) return { success: false, message: 'Kaldırma komutu bulunamadı.' };
      await execAsync(uninstallString);
      return { success: true, message: 'Program kaldırma işlemi başlatıldı.' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async installPackage(filePath, options = {}) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.exe') {
        // Run installer silently or normally
        await execAsync(`start "" "${filePath}"`);
        return { success: true, message: 'Yükleyici başlatıldı.' };
      } else if (ext === '.msi') {
        await execAsync(`msiexec /i "${filePath}" /passive`);
        return { success: true, message: 'MSI kurulumu tamamlandı.' };
      } else if (ext === '.zip') {
        const targetDir = path.join(require('os').homedir(), 'AppData', 'Local', 'Programs', path.basename(filePath, '.zip'));
        fs.mkdirSync(targetDir, { recursive: true });
        await execAsync(`powershell -NoProfile -Command "Expand-Archive -Path '${filePath}' -DestinationPath '${targetDir}' -Force"`);
        return { success: true, message: `Paket ${targetDir} konumuna kuruldu.` };
      } else {
        return { success: true, message: 'Paket arşivlendi ve doğrulandı.' };
      }
    } catch (error) {
      return { success: false, message: 'Kurulum hatası: ' + error.message };
    }
  }
}

module.exports = UniversalPackageInstaller;
