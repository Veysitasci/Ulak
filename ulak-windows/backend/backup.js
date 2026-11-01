const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class BackupManager {
  constructor() {
    this.dest = path.join(os.homedir(), 'Yedekler', 'ULAK');
    if (!fs.existsSync(this.dest)) {
      fs.mkdirSync(this.dest, { recursive: true });
    }
    this.manifestPath = path.join(this.dest, 'manifest.json');
  }

  getSourceCatalog() {
    const home = os.homedir();
    return [
      { id: 'documents', name: 'Belgeler', path: path.join(home, 'Documents'), icon: 'folder-documents-symbolic' },
      { id: 'desktop', name: 'Masaüstü', path: path.join(home, 'Desktop'), icon: 'user-desktop-symbolic' },
      { id: 'downloads', name: 'İndirilenler', path: path.join(home, 'Downloads'), icon: 'folder-download-symbolic' },
      { id: 'pictures', name: 'Resimler', path: path.join(home, 'Pictures'), icon: 'folder-pictures-symbolic' },
      { id: 'ssh', name: 'SSH Anahtarları', path: path.join(home, '.ssh'), icon: 'security-high-symbolic' },
      { id: 'ulak', name: 'ULAK Yapılandırması', path: path.join(home, 'AppData', 'Roaming', 'ulak-windows'), icon: 'preferences-system-symbolic' }
    ];
  }

  loadManifest() {
    try {
      if (fs.existsSync(this.manifestPath)) {
        return JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
      }
    } catch (e) {}
    return { files: {}, lastBackup: 0 };
  }

  saveManifest(manifest) {
    try {
      fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    } catch (e) {}
  }

  async listArchives() {
    try {
      const files = fs.readdirSync(this.dest);
      const archives = [];
      for (const file of files) {
        if (file.startsWith('ULAK_') && (file.endsWith('.zip') || file.endsWith('.tar.gz'))) {
          const fp = path.join(this.dest, file);
          const st = fs.statSync(fp);
          const isFull = file.includes('FULL');
          const szMB = Math.round((st.size / (1024 * 1024)) * 10) / 10;
          archives.push({
            name: file,
            path: fp,
            isFull,
            sizeMB: szMB,
            size: szMB > 0 ? `${szMB} MB` : `${Math.round(st.size / 1024)} KB`,
            time: st.mtime,
            date: st.mtime.toLocaleString('tr-TR')
          });
        }
      }
      return archives.sort((a, b) => b.time - a.time);
    } catch (e) {
      return [];
    }
  }

  async createBackup(isFull = false, selectedSourceIds = []) {
    try {
      const catalog = this.getSourceCatalog();
      const ids = (!selectedSourceIds || selectedSourceIds.length === 0) 
        ? ['documents', 'desktop'] 
        : selectedSourceIds;
      const validSources = catalog.filter(c => ids.includes(c.id) && fs.existsSync(c.path));

      if (validSources.length === 0) {
        return { success: false, message: 'Seçili kaynak klasörler bulunamadı.' };
      }

      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 15);
      const archiveName = `ULAK_${isFull ? 'FULL' : 'INCR'}_${timestamp}.zip`;
      const archivePath = path.join(this.dest, archiveName);

      // PowerShell Compress-Archive
      const pathsToCompress = validSources.map(s => `'${s.path}'`).join(', ');
      const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path ${pathsToCompress} -DestinationPath '${archivePath}' -Force"`;

      await execAsync(psCommand);

      const st = fs.statSync(archivePath);
      const manifest = this.loadManifest();
      manifest.lastBackup = Date.now();
      this.saveManifest(manifest);

      return {
        success: true,
        message: `${archiveName} (${Math.round(st.size / (1024 * 1024))} MB) başarıyla oluşturuldu.`,
        archiveName,
        path: archivePath
      };
    } catch (error) {
      return { success: false, message: 'Yedekleme başarısız: ' + error.message };
    }
  }

  async restoreArchive(archivePath, targetDir) {
    try {
      if (!fs.existsSync(archivePath)) {
        return { success: false, message: 'Arşiv dosyası bulunamadı.' };
      }
      const destFolder = targetDir || path.join(os.homedir(), 'Desktop', 'ULAK_Kurtarilan_' + Date.now());
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }

      await execAsync(`powershell -NoProfile -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destFolder}' -Force"`);

      return {
        success: true,
        message: 'Arşiv başarıyla geri yüklendi.',
        targetPath: destFolder
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async verifyArchive(archivePath) {
    try {
      if (!fs.existsSync(archivePath)) {
        return { success: false, message: 'Dosya bulunamadı.' };
      }
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256');
      const data = fs.readFileSync(archivePath);
      hash.update(data);
      const sha256 = hash.digest('hex');

      // Test zip extraction header
      const testCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('${archivePath}').Entries.Count"`;
      const { stdout } = await execAsync(testCmd);
      const entryCount = parseInt(stdout.trim()) || 0;

      return {
        success: true,
        isValid: entryCount > 0,
        entryCount,
        sha256,
        sizeBytes: data.length
      };
    } catch (e) {
      return { success: false, isValid: false, message: e.message };
    }
  }

  getStorageStats() {
    try {
      let totalMB = 0;
      let count = 0;
      if (fs.existsSync(this.dest)) {
        const files = fs.readdirSync(this.dest);
        for (const f of files) {
          if (f.endsWith('.zip')) {
            const st = fs.statSync(path.join(this.dest, f));
            totalMB += Math.round(st.size / (1024 * 1024));
            count++;
          }
        }
      }
      const manifest = this.loadManifest();
      return {
        totalMB,
        count,
        destPath: this.dest,
        lastBackup: manifest.lastBackup ? new Date(manifest.lastBackup).toLocaleString('tr-TR') : 'Henüz Yapılmadı'
      };
    } catch (e) {
      return { totalMB: 0, count: 0, destPath: this.dest, lastBackup: 'Bilinmiyor' };
    }
  }

  openBackupFolder() {
    const { shell } = require('electron');
    if (fs.existsSync(this.dest)) {
      shell.openPath(this.dest);
      return { success: true };
    }
    return { success: false, message: 'Klasör bulunamadı.' };
  }

  async deleteArchive(archivePath) {
    try {
      if (fs.existsSync(archivePath)) {
        fs.unlinkSync(archivePath);
        return { success: true, message: 'Arşiv silindi.' };
      }
      return { success: false, message: 'Dosya bulunamadı.' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
}

module.exports = BackupManager;
