const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const execAsync = promisify(exec);

class ProcessRadarManager {
  constructor() {
    this.criticalSystemProcesses = new Set([
      'svchost.exe', 'explorer.exe', 'csrss.exe', 'lsass.exe', 'services.exe',
      'smss.exe', 'winlogon.exe', 'wininit.exe', 'taskhostw.exe', 'dwm.exe',
      'spoolsv.exe', 'sihost.exe', 'fontdrvhost.exe'
    ]);
    this.cache = null;
    this.lastFetchTime = 0;
    this.cacheTtlMs = 3000; // 3 seconds in-memory cache
  }

  async getProcesses(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cache && (now - this.lastFetchTime < this.cacheTtlMs)) {
      return this.cache;
    }

    try {
      // Ultra-fast Get-CimInstance Win32_Process (~4x faster than Get-Process, no disk I/O per row)
      const psCmd = `Get-CimInstance Win32_Process | Select-Object ProcessId, Name, WorkingSetSize, ExecutablePath, CommandLine, ThreadCount | ConvertTo-Json -Compress`;
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCmd}"`, {
        maxBuffer: 25 * 1024 * 1024
      });

      if (!stdout || !stdout.trim()) {
        return this.cache || [];
      }

      let parsed = JSON.parse(stdout);
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }

      const winDir = (process.env.SystemRoot || 'C:\\Windows').toLowerCase();
      const sys32Dir = path.join(winDir, 'system32').toLowerCase();
      const tempDir = (process.env.TEMP || '').toLowerCase();
      const appDataDir = (process.env.APPDATA || '').toLowerCase();
      const localAppDataDir = (process.env.LOCALAPPDATA || '').toLowerCase();

      const results = parsed
        .filter(p => p.ProcessId && p.ProcessId > 4) // Skip Idle & System
        .map((p) => {
          const pid = p.ProcessId || 0;
          const name = p.Name || 'Bilinmiyor';
          const rawPath = (p.ExecutablePath || '').trim();
          const lowerPath = rawPath.toLowerCase();
          const memoryMB = p.WorkingSetSize ? Math.round((p.WorkingSetSize / (1024 * 1024)) * 10) / 10 : 0;
          const threadCount = p.ThreadCount || 1;
          const commandLine = (p.CommandLine || '').trim();

          const reasons = [];
          let riskLevel = 'normal'; // 'normal' | 'warning' | 'high'
          const exeName = (name.endsWith('.exe') ? name : `${name}.exe`).toLowerCase();

          // 1. Masquerading Denetimi (Kritik Windows Süreç Sahtekarlığı)
          if (this.criticalSystemProcesses.has(exeName)) {
            if (lowerPath) {
              if (exeName === 'explorer.exe') {
                if (!lowerPath.startsWith(winDir)) {
                  riskLevel = 'high';
                  reasons.push('Kritik: explorer.exe Windows dizini dışından çalıştırılıyor (Sahte Süreç / Truva Atı)!');
                }
              } else if (!lowerPath.startsWith(sys32Dir)) {
                riskLevel = 'high';
                reasons.push(`Kritik: ${exeName} System32 dizini dışından çalıştırılıyor (Masquerading Saldırısı)!`);
              }
            }
          }

          // 2. Şüpheli Dizin Denetimi (Temp, AppData, Downloads vb.)
          if (lowerPath) {
            if (tempDir && lowerPath.startsWith(tempDir)) {
              if (riskLevel !== 'high') riskLevel = 'high';
              reasons.push('Yüksek Risk: Süreç geçici dizinden (%TEMP%) çalıştırılıyor.');
            } else if (localAppDataDir && lowerPath.startsWith(path.join(localAppDataDir, 'temp'))) {
              if (riskLevel !== 'high') riskLevel = 'high';
              reasons.push('Yüksek Risk: Süreç AppData\\Local\\Temp dizininden çalıştırılıyor.');
            } else if (lowerPath.includes('\\users\\public\\')) {
              if (riskLevel !== 'high') riskLevel = 'high';
              reasons.push('Yüksek Risk: Süreç C:\\Users\\Public ortak dizininden çalıştırılıyor.');
            } else if (lowerPath.includes('\\downloads\\')) {
              if (riskLevel === 'normal') riskLevel = 'warning';
              reasons.push('Uyarı: Süreç İndirilenler (Downloads) klasöründen doğrudan çalıştırılıyor.');
            }
          }

          // 3. Kaynak Tüketim Anomali Denetimi
          if (memoryMB > 1500) {
            if (riskLevel === 'normal') riskLevel = 'warning';
            reasons.push(`Yüksek Bellek Tüketimi: Süreç ${memoryMB} MB RAM kullanıyor.`);
          }

          return {
            pid,
            name,
            exeName,
            path: rawPath || 'Erişim Kısıtlı / Sistem Korumalı',
            commandLine: commandLine || `${rawPath || name}`,
            threadCount,
            memoryMB,
            riskLevel,
            isSuspicious: riskLevel !== 'normal',
            reasons
          };
        });

      // Sırala: Önce risk seviyesi (high -> warning -> normal), sonra bellek
      results.sort((a, b) => {
        const order = { high: 0, warning: 1, normal: 2 };
        if (order[a.riskLevel] !== order[b.riskLevel]) {
          return order[a.riskLevel] - order[b.riskLevel];
        }
        return b.memoryMB - a.memoryMB;
      });

      this.cache = results;
      this.lastFetchTime = now;
      return results;
    } catch (err) {
      console.error('[ProcessRadar] Süreç listesi alınamadı:', err);
      return this.cache || [];
    }
  }

  async killProcess(pid, forceTree = false) {
    if (!pid || pid <= 4) {
      return { success: false, message: 'Kritik sistem süreçleri (PID <= 4) sonlandırılamaz.' };
    }

    // Invalidate cache
    this.cache = null;

    try {
      if (forceTree) {
        await execAsync(`taskkill /F /PID ${pid} /T`);
      } else {
        await execAsync(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force"`);
      }
      return { success: true, message: `PID ${pid} süreci başarıyla sonlandırıldı.` };
    } catch (err) {
      try {
        await execAsync(`taskkill /F /PID ${pid}`);
        return { success: true, message: `PID ${pid} süreci taskkill ile sonlandırıldı.` };
      } catch (err2) {
        return { success: false, message: `Süreç sonlandırılamadı: ${err2.message}` };
      }
    }
  }

  async getProcessDetails(pid) {
    if (!pid) return { error: 'Geçersiz PID' };

    // Check if we have basic details from cached process
    let cached = null;
    if (this.cache) {
      cached = this.cache.find(p => p.pid === pid);
    }

    try {
      // Query loaded DLL modules
      const psCmd = `Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Modules -ErrorAction SilentlyContinue | Select-Object ModuleName, FileName | ConvertTo-Json -Compress`;
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCmd}"`, {
        maxBuffer: 10 * 1024 * 1024
      });

      let modules = [];
      if (stdout && stdout.trim()) {
        try {
          const parsed = JSON.parse(stdout);
          const rawArr = Array.isArray(parsed) ? parsed : [parsed];
          modules = rawArr.map(m => ({
            name: m.ModuleName || 'Bilinmiyor',
            path: m.FileName || ''
          }));
        } catch (e) {
          modules = [];
        }
      }

      return {
        pid,
        commandLine: cached ? cached.commandLine : 'Alınamadı',
        threadCount: cached ? cached.threadCount : 1,
        modules
      };
    } catch (err) {
      return {
        pid,
        commandLine: cached ? cached.commandLine : 'Alınamadı',
        threadCount: cached ? cached.threadCount : 1,
        modules: []
      };
    }
  }
}

module.exports = ProcessRadarManager;
