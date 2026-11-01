const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

class SystemMonitor {
  async getCPUInfo() {
    try {
      const { stdout } = await execAsync('wmic cpu get Name,NumberOfCores,MaxClockSpeed /format:list');
      const lines = stdout.split('\n');
      const info = {};
      lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          info[key.trim()] = value.trim();
        }
      });
      const usage = await this.getCPUUsage();
      const speedStr = info.MaxClockSpeed ? `${(parseInt(info.MaxClockSpeed) / 1000).toFixed(1)} GHz` : '2.4 GHz';
      return {
        name: info.Name || (os.cpus()[0] && os.cpus()[0].model) || 'Windows CPU',
        model: info.Name || (os.cpus()[0] && os.cpus()[0].model) || 'Windows CPU',
        cores: parseInt(info.NumberOfCores) || os.cpus().length,
        speed: speedStr,
        maxSpeed: parseInt(info.MaxClockSpeed) || 0,
        usage,
        currentUsage: usage
      };
    } catch (error) {
      const usage = await this.getCPUUsage();
      return {
        name: (os.cpus()[0] && os.cpus()[0].model) || 'Windows CPU',
        model: (os.cpus()[0] && os.cpus()[0].model) || 'Windows CPU',
        cores: os.cpus().length,
        speed: '2.4 GHz',
        maxSpeed: 0,
        usage,
        currentUsage: usage
      };
    }
  }

  async getCPUUsage() {
    try {
      const { stdout } = await execAsync('wmic cpu get LoadPercentage /value');
      const match = stdout.match(/LoadPercentage=(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  async getMemoryInfo() {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usagePercent = Math.round((usedMem / totalMem) * 100);
      const totalGB = (totalMem / 1024 / 1024 / 1024).toFixed(1);
      const freeGB = (freeMem / 1024 / 1024 / 1024).toFixed(1);
      const usedGB = (usedMem / 1024 / 1024 / 1024).toFixed(1);

      return {
        total: Math.round(totalMem / 1024 / 1024 / 1024),
        used: Math.round(usedMem / 1024 / 1024 / 1024),
        free: Math.round(freeMem / 1024 / 1024 / 1024),
        totalGB,
        usedGB,
        freeGB,
        usagePercent
      };
    } catch (error) {
      return {
        total: 8,
        used: 4,
        free: 4,
        totalGB: '8.0',
        usedGB: '4.0',
        freeGB: '4.0',
        usagePercent: 50
      };
    }
  }

  async getDiskInfo() {
    try {
      const { stdout } = await execAsync('wmic logicaldisk get Name,Size,FreeSpace,FileSystem /format:list');
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

      if (disks.length === 0) {
        disks.push({ name: 'C:', drive: 'C:', total: 256, free: 128, used: 128, usagePercent: 50, usePercent: 50 });
      }

      return disks;
    } catch (error) {
      return [{ name: 'C:', drive: 'C:', total: 256, free: 128, used: 128, usagePercent: 50, usePercent: 50 }];
    }
  }

  async getProcesses(limit = 10) {
    try {
      const { stdout } = await execAsync(`tasklist /fo csv | findstr /V "Image Name"`);
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

      return processes;
    } catch (error) {
      return [];
    }
  }

  async killProcess(pid) {
    try {
      await execAsync(`taskkill /F /PID ${pid}`);
      return { success: true, message: `Process ${pid} killed` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getNetworkInfo() {
    try {
      const { stdout } = await execAsync('ipconfig /all');
      const interfaces = [];

      const blocks = stdout.split(/\n\n+/);
      for (const block of blocks) {
        if (block.includes('Ethernet') || block.includes('Wireless')) {
          const lines = block.split('\n');
          const iface = {
            name: '',
            ip: '',
            mac: '',
            status: 'Unknown'
          };

          lines.forEach(line => {
            if (line.includes('adapter')) {
              iface.name = line.split(':')[0].trim();
            }
            if (line.includes('IPv4')) {
              const match = line.match(/IPv4[^:]+:\s*([\d.]+)/);
              if (match) iface.ip = match[1];
            }
            if (line.includes('Physical')) {
              const match = line.match(/Physical[^:]+:\s*([0-9A-F-]+)/);
              if (match) iface.mac = match[1];
            }
          });

          if (iface.name) interfaces.push(iface);
        }
      }

      const firstActive = interfaces.find(i => i.ip && i.ip !== '127.0.0.1') || interfaces[0] || { ip: '127.0.0.1' };
      return {
        ip: firstActive.ip || '127.0.0.1',
        isConnected: !!(firstActive.ip && firstActive.ip !== '127.0.0.1'),
        interfaces
      };
    } catch (error) {
      return {
        ip: '127.0.0.1',
        isConnected: true,
        interfaces: []
      };
    }
  }

  async getBatteryInfo() {
    try {
      const { stdout } = await execAsync('wmic battery get Status,EstimatedChargeRemaining /format:list');
      const lines = stdout.split('\n');
      const info = {};
      lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          info[key.trim()] = value.trim();
        }
      });

      return {
        status: info.Status || 'Unknown',
        charge: parseInt(info.EstimatedChargeRemaining) || 0,
        hasBattery: !!info.Status
      };
    } catch (error) {
      return {
        status: 'Unknown',
        charge: 0,
        hasBattery: false
      };
    }
  }
}

module.exports = SystemMonitor;
