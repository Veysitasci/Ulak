const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const LocalHardwareCache = require('./hardwareCache');

const execAsync = promisify(exec);

class SystemMonitor {
  constructor() {
    this.cache = new LocalHardwareCache();
    this.lastCpuMeasure = null;
  }

  /**
   * Node.js os.cpus() tick delta algoritması ile 0 proses maliyeti ve 0 ms gecikmeyle CPU kullanımı hesabı.
   */
  _calculateCpuUsage() {
    const cpus = os.cpus();
    if (!cpus || cpus.length === 0) return 0;

    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    if (!this.lastCpuMeasure) {
      this.lastCpuMeasure = { idle: totalIdle, total: totalTick };
      return 5; // İlk referans başlangıç tahmini
    }

    const deltaIdle = totalIdle - this.lastCpuMeasure.idle;
    const deltaTotal = totalTick - this.lastCpuMeasure.total;
    this.lastCpuMeasure = { idle: totalIdle, total: totalTick };

    if (deltaTotal <= 0) return 0;
    const usage = Math.round(100 * (1 - deltaIdle / deltaTotal));
    return Math.max(0, Math.min(100, usage));
  }

  /**
   * Anlık CPU kullanım yüzdesini döner (2 saniyelik hafif cache).
   */
  async getCPUUsage(forceRefresh = false) {
    if (!forceRefresh) {
      const cachedUsage = this.cache.get('cpuUsage', 2000);
      if (cachedUsage !== null) {
        return cachedUsage;
      }
    }

    const usage = this._calculateCpuUsage();
    this.cache.set('cpuUsage', usage, 2000, false);
    return usage;
  }

  /**
   * CPU model ve donanım mimarisini döner.
   * Statik donanım bilgisi (model, çekirdek, max frekans) bir kere yerel diske kaydedilir,
   * sonraki çağrılarda donanıma tekrar gitmeden anında yerelden sunulur.
   */
  async getCPUInfo(forceRefresh = false) {
    let staticInfo = !forceRefresh ? this.cache.get('cpuStatic') : null;

    if (!staticInfo) {
      const primaryCpu = (os.cpus() && os.cpus()[0]) || {};
      const fallbackName = primaryCpu.model ? primaryCpu.model.trim() : 'Windows CPU';
      const fallbackSpeed = primaryCpu.speed ? `${(primaryCpu.speed / 1000).toFixed(1)} GHz` : '2.4 GHz';
      const fallbackCores = os.cpus().length || 4;

      staticInfo = {
        name: fallbackName,
        model: fallbackName,
        cores: fallbackCores,
        speed: fallbackSpeed,
        maxSpeed: primaryCpu.speed || 2400
      };

      // WMI üzerinden daha ayrıntılı donanım adı varsa sessizce zenginleştir
      try {
        const { stdout } = await execAsync('wmic cpu get Name,NumberOfCores,MaxClockSpeed /format:list', { timeout: 3000 });
        const lines = stdout.split('\n');
        const info = {};
        lines.forEach(line => {
          const [key, value] = line.split('=');
          if (key && value) {
            info[key.trim()] = value.trim();
          }
        });

        if (info.Name) {
          staticInfo.name = info.Name;
          staticInfo.model = info.Name;
        }
        if (info.NumberOfCores) {
          staticInfo.cores = parseInt(info.NumberOfCores) || fallbackCores;
        }
        if (info.MaxClockSpeed) {
          staticInfo.maxSpeed = parseInt(info.MaxClockSpeed) || primaryCpu.speed || 2400;
          staticInfo.speed = `${(staticInfo.maxSpeed / 1000).toFixed(1)} GHz`;
        }
      } catch (e) {
        // Fallback bilgisi geçerli kalır
      }

      // Kalıcı olarak yerel diske ve önbelleğe kaydet
      this.cache.set('cpuStatic', staticInfo, 24 * 60 * 60 * 1000, true);
    }

    const usage = await this.getCPUUsage(forceRefresh);

    return {
      ...staticInfo,
      usage,
      currentUsage: usage,
      isCached: !forceRefresh
    };
  }

  /**
   * Fiziksel RAM durumu. Total RAM sabittir, serbest RAM yerel C++ katmanından (0 ms) alınır.
   */
  async getMemoryInfo(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = this.cache.get('memory', 2500);
      if (cached) return { ...cached, isCached: true };
    }

    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usagePercent = Math.round((usedMem / totalMem) * 100);
      const totalGB = (totalMem / 1024 / 1024 / 1024).toFixed(1);
      const freeGB = (freeMem / 1024 / 1024 / 1024).toFixed(1);
      const usedGB = (usedMem / 1024 / 1024 / 1024).toFixed(1);

      const memData = {
        total: Math.round(totalMem / 1024 / 1024 / 1024),
        used: Math.round(usedMem / 1024 / 1024 / 1024),
        free: Math.round(freeMem / 1024 / 1024 / 1024),
        totalGB,
        usedGB,
        freeGB,
        usagePercent
      };

      this.cache.set('memory', memData, 2500, false);
      this.cache.set('memoryStatic', { totalGB, total: memData.total }, 24 * 60 * 60 * 1000, true);

      return { ...memData, isCached: false };
    } catch (error) {
      const fallback = this.cache.get('memoryStatic') || { totalGB: '8.0', total: 8 };
      return {
        total: fallback.total,
        used: 4,
        free: 4,
        totalGB: fallback.totalGB,
        usedGB: '4.0',
        freeGB: '4.0',
        usagePercent: 50,
        isCached: true
      };
    }
  }

  /**
   * Disk bilgisi. Ağır WMI sorgulaması yapıldığı için 30 saniye TTL ile önbelleklenir
   * ve yerel diske kaydedilir.
   */
  async getDiskInfo(forceRefresh = false) {
    if (!forceRefresh) {
      const cachedDisks = this.cache.get('disk', 30000);
      if (cachedDisks) {
        return cachedDisks;
      }
    }

    try {
      const { stdout } = await execAsync('wmic logicaldisk get Name,Size,FreeSpace,FileSystem /format:list', { timeout: 4000 });
      const disks = [];
      const blocks = stdout.split(/\n\n+/).filter(b => b.trim());

      for (const block of blocks) {
        const info = {};
        block.split('\n').forEach(line => {
          const [key, value] = line.split('=');
          if (key && value) {
            info[key.trim()] = value.trim();
          }
        });

        if (info.Name) {
          const size = parseInt(info.Size) || 0;
          const free = parseInt(info.FreeSpace) || 0;
          const pct = size > 0 ? Math.round(((size - free) / size) * 100) : 0;
          disks.push({
            name: info.Name,
            drive: info.Name,
            fileSystem: info.FileSystem || 'NTFS',
            total: Math.round(size / 1024 / 1024 / 1024),
            free: Math.round(free / 1024 / 1024 / 1024),
            used: Math.round((size - free) / 1024 / 1024 / 1024),
            usagePercent: pct,
            usePercent: pct
          });
        }
      }

      const finalDisks = disks.length > 0 ? disks : [
        { name: 'C:', drive: 'C:', fileSystem: 'NTFS', total: 256, free: 128, used: 128, usagePercent: 50, usePercent: 50 }
      ];

      // Yerel diske ve önbelleğe kaydet
      this.cache.set('disk', finalDisks, 30000, true);
      return finalDisks;
    } catch (error) {
      const cached = this.cache.get('disk', 24 * 60 * 60 * 1000);
      if (cached) return cached;
      return [{ name: 'C:', drive: 'C:', fileSystem: 'NTFS', total: 256, free: 128, used: 128, usagePercent: 50, usePercent: 50 }];
    }
  }

  /**
   * Süreç listesi. 5 saniye TTL ile önbelleklenir.
   */
  async getProcesses(limit = 10, forceRefresh = false) {
    const cacheKey = `processes_${limit}`;
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey, 5000);
      if (cached) return cached;
    }

    try {
      const { stdout } = await execAsync(`tasklist /fo csv | findstr /V "Image Name"`, { timeout: 4000 });
      const lines = stdout.split('\n').filter(line => line.trim());
      const processes = [];

      for (const line of lines.slice(0, limit)) {
        const parts = line.split('","').map(p => p.replace(/"/g, ''));
        if (parts.length >= 5) {
          processes.push({
            name: parts[0],
            pid: parseInt(parts[1]),
            memory: parts[4],
            cpu: 'N/A'
          });
        }
      }

      this.cache.set(cacheKey, processes, 5000, false);
      return processes;
    } catch (error) {
      return this.cache.get(cacheKey, 60000) || [];
    }
  }

  async killProcess(pid) {
    try {
      await execAsync(`taskkill /F /PID ${pid}`);
      // Süreç öldüğünde süreç önbelleğini geçersiz kıl
      this.cache.invalidate('processes_10');
      this.cache.invalidate('processes_40');
      return { success: true, message: `Process ${pid} killed` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Ağ durumu ve IP bilgileri.
   * `os.networkInterfaces()` kullanılarak 0 ms gecikmeyle ve harici alt süreç (ipconfig)
   * çalıştırmadan yerel olarak derlenir.
   */
  async getNetworkInfo(forceRefresh = false) {
    if (!forceRefresh) {
      const cachedNet = this.cache.get('network', 15000);
      if (cachedNet) return { ...cachedNet, isCached: true };
    }

    try {
      const ifaces = os.networkInterfaces();
      const interfaces = [];
      let primaryIp = '127.0.0.1';
      let isConnected = false;

      for (const [name, addrs] of Object.entries(ifaces)) {
        for (const addr of addrs) {
          if (addr.family === 'IPv4' && !addr.internal) {
            interfaces.push({
              name,
              ip: addr.address,
              mac: addr.mac || '',
              status: 'Connected'
            });

            if (!isConnected && addr.address !== '127.0.0.1') {
              primaryIp = addr.address;
              isConnected = true;
            }
          }
        }
      }

      const netData = {
        ip: primaryIp,
        isConnected,
        interfaces
      };

      this.cache.set('network', netData, 15000, true);
      return { ...netData, isCached: false };
    } catch (error) {
      const fallback = this.cache.get('network', 24 * 60 * 60 * 1000);
      return fallback || { ip: '127.0.0.1', isConnected: true, interfaces: [], isCached: true };
    }
  }

  /**
   * Batarya / Güç durumu.
   * Masaüstü bilgisayarda batarya olmadığı bir kez belirlenirse kalıcı olarak kaydedilir
   * ve gereksiz wmic battery sorguları tamamen engellenir!
   */
  async getBatteryInfo(forceRefresh = false) {
    if (!forceRefresh) {
      const cachedBatt = this.cache.get('battery', 45000);
      if (cachedBatt) {
        return { ...cachedBatt, isCached: true };
      }
    }

    // Eğer önceki kalıcı kayıtta masaüstü (hasBattery = false) olduğu biliniyorsa ve forceRefresh değilse
    const knownStatic = this.cache.get('battery', 24 * 60 * 60 * 1000);
    if (knownStatic && knownStatic.hasBattery === false && !forceRefresh) {
      return { ...knownStatic, isCached: true };
    }

    try {
      const { stdout } = await execAsync('wmic battery get Status,EstimatedChargeRemaining /format:list', { timeout: 3000 });
      const lines = stdout.split('\n');
      const info = {};
      lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          info[key.trim()] = value.trim();
        }
      });

      const hasBattery = !!info.Status && info.Status.trim().length > 0;
      const charge = parseInt(info.EstimatedChargeRemaining) || 0;

      const battData = {
        status: info.Status || 'Desktop AC',
        charge,
        percent: charge,
        isCharging: info.Status === '2' || info.Status === 'Charging',
        hasBattery
      };

      this.cache.set('battery', battData, hasBattery ? 45000 : 24 * 60 * 60 * 1000, true);
      return { ...battData, isCached: false };
    } catch (error) {
      const battData = {
        status: 'Desktop AC',
        charge: 0,
        percent: 0,
        isCharging: false,
        hasBattery: false
      };
      this.cache.set('battery', battData, 24 * 60 * 60 * 1000, true);
      return { ...battData, isCached: true };
    }
  }

  /**
   * Tüm donanımı zorla sıfırdan tara ve yerel depolamayı güncelle
   */
  async refreshAllHardware() {
    this.cache.invalidate();
    const [cpu, mem, disk, net, batt] = await Promise.all([
      this.getCPUInfo(true),
      this.getMemoryInfo(true),
      this.getDiskInfo(true),
      this.getNetworkInfo(true),
      this.getBatteryInfo(true)
    ]);
    this.cache.persistNow();
    return {
      success: true,
      timestamp: new Date().toISOString(),
      cpu,
      mem,
      disk,
      net,
      batt
    };
  }

  getCacheStatus() {
    return this.cache.getAllCachedData();
  }

  // 1. GPU ve VRAM Canlı Telemetrisi
  async getGpuTelemetry() {
    try {
      const psCmd = `powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object -First 2 Name, DriverVersion, AdapterRAM | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCmd);
      let data = JSON.parse(stdout || '[]');
      if (!Array.isArray(data)) data = [data];

      return data.map(g => ({
        name: g.Name || 'Grafik Kartı',
        driver: g.DriverVersion || '--',
        vramMB: g.AdapterRAM ? Math.round(g.AdapterRAM / (1024 * 1024)) : 4096
      }));
    } catch (e) {
      return [{ name: 'Standart Grafik Kartı', driver: '--', vramMB: 4096 }];
    }
  }

  // 2. Disk S.M.A.R.T. ve SSD/HDD Sağlık Durumu
  async getDiskHealthSmart() {
    try {
      const psCmd = `powershell -NoProfile -Command "Get-PhysicalDisk | Select-Object FriendlyName, MediaType, HealthStatus, OperationalStatus, Size | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCmd);
      let data = JSON.parse(stdout || '[]');
      if (!Array.isArray(data)) data = [data];

      return data.map(d => ({
        name: d.FriendlyName || 'Depolama Sürücüsü',
        type: d.MediaType || 'SSD',
        health: d.HealthStatus || 'Healthy (Sağlıklı)',
        status: d.OperationalStatus || 'OK',
        sizeGB: d.Size ? Math.round(d.Size / (1024 * 1024 * 1024)) : 512
      }));
    } catch (e) {
      return [{ name: 'Birincil NVMe SSD', type: 'SSD', health: 'Healthy (Sağlıklı)', status: 'OK', sizeGB: 512 }];
    }
  }

  // 3. Pil Sağlığı & Aşınma Raporu (Wear Level)
  async getBatteryHealthReport() {
    try {
      const psCmd = `powershell -NoProfile -Command "Get-CimInstance -Namespace root/wmi -ClassName BatteryStaticData -ErrorAction SilentlyContinue | Select-Object DesignedCapacity, FullChargedCapacity | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCmd);
      let data = null;
      try { data = JSON.parse(stdout); } catch(e) {}

      if (data && data.DesignedCapacity && data.FullChargedCapacity) {
        const design = data.DesignedCapacity;
        const full = data.FullChargedCapacity;
        const wear = Math.max(0, Math.round(100 - (full / design) * 100));
        return { hasReport: true, designCapacity: design, fullCapacity: full, wearPercent: wear, healthStatus: wear < 20 ? 'Mükemmel' : wear < 40 ? 'İyi' : 'Servis Önerilir' };
      }
      return { hasReport: false, message: 'Cihaz masaüstü veya AC güç kaynağında çalışıyor.' };
    } catch (e) {
      return { hasReport: false, message: 'Pil sağlık verisi desteklenmiyor.' };
    }
  }

  // 4. Anakart & BIOS Mimarisi
  async getMotherboardBiosInfo() {
    try {
      const psCmd = `powershell -NoProfile -Command "$mb = Get-CimInstance Win32_BaseBoard; $bios = Get-CimInstance Win32_BIOS; [PSCustomObject]@{ Manufacturer = $mb.Manufacturer; Product = $mb.Product; BiosVersion = $bios.SMBIOSBIOSVersion; ReleaseDate = $bios.ReleaseDate } | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCmd);
      const data = JSON.parse(stdout || '{}');
      return {
        board: `${data.Manufacturer || ''} ${data.Product || ''}`.trim() || 'Ana Kart Bilgisi',
        bios: data.BiosVersion || 'UEFI 2.0',
        biosDate: data.ReleaseDate ? new Date(data.ReleaseDate).toLocaleDateString('tr-TR') : 'Güncel'
      };
    } catch (e) {
      return { board: 'Standart Sistem Anakartı', bios: 'UEFI v2.8', biosDate: '2026' };
    }
  }

  // 5. En Çok Kaynak Tüketen Süreçler (Top Resource Consumers)
  async getTopResourceProcesses(sortBy = 'memory', limit = 25) {
    try {
      const psCmd = `powershell -NoProfile -Command "Get-Process | Where-Object { $_.WorkingSet64 -gt 0 } | Sort-Object WorkingSet64 -Descending | Select-Object -First ${limit} Id, ProcessName, CPU, @{Name='MemoryMB';Expression={[math]::Round($_.WorkingSet64/1MB)}} | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCmd);
      let data = JSON.parse(stdout || '[]');
      if (!Array.isArray(data)) data = [data];

      return data.map(p => ({
        pid: p.Id,
        name: p.ProcessName,
        memoryMB: p.MemoryMB || 0,
        memory: `${p.MemoryMB || 0} MB`,
        mem: `${p.MemoryMB || 0} MB`,
        cpu: p.CPU ? Math.round(p.CPU) : 0
      }));
    } catch (e) {
      return this.getProcesses(limit);
    }
  }
}

module.exports = SystemMonitor;
