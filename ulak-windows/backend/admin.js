const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class AdminManager {
  async executeCommand(command) {
    try {
      const { stdout, stderr } = await execAsync(command, { shell: 'powershell.exe' });
      return stdout || stderr || 'İşlem tamamlandı (çıktı yok).';
    } catch (error) {
      return error.stdout || error.stderr || error.message;
    }
  }

  async getFirewallStatus() {
    try {
      const { stdout } = await execAsync('netsh advfirewall show allprofiles');
      return stdout;
    } catch (error) {
      return 'Güvenlik duvarı durumu alınamadı: ' + error.message;
    }
  }

  async setFirewall(state) {
    try {
      const onOff = state ? 'on' : 'off';
      await execAsync(`netsh advfirewall set allprofiles state ${onOff}`);
      return `Güvenlik duvarı ${state ? 'devreye alındı' : 'kapatıldı'}.`;
    } catch (error) {
      return 'İşlem başarısız (Yönetici yetkisi gerekebilir): ' + error.message;
    }
  }

  async checkUpdates() {
    try {
      const { stdout } = await execAsync('winget upgrade');
      return stdout || 'Tüm paketler güncel.';
    } catch (error) {
      return 'Güncelleme denetimi yapılamadı: ' + error.message;
    }
  }

  async updateAll() {
    try {
      const { stdout } = await execAsync('winget upgrade --all --accept-package-agreements --accept-source-agreements --silent');
      return stdout || 'Paket güncelleme işlemi tamamlandı.';
    } catch (error) {
      return 'Güncelleme hatası: ' + error.message;
    }
  }

  async getAutostartItems() {
    try {
      const { stdout } = await execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location | Format-Table -AutoSize"');
      return stdout || 'Başlangıç öğesi bulunamadı.';
    } catch (error) {
      try {
        const { stdout } = await execAsync('wmic startup get Caption,Command,Location /format:list');
        return stdout || 'Başlangıç öğesi bulunamadı.';
      } catch (e) {
        return 'Başlangıç servisleri listelenemedi: ' + error.message;
      }
    }
  }

  async getUsers() {
    try {
      const { stdout } = await execAsync('net user');
      return stdout || 'Kullanıcılar alınamadı.';
    } catch (error) {
      return 'Kullanıcı listesi alınamadı: ' + error.message;
    }
  }

  // 1. Windows Servisleri Listesi (Durum & Başlangıç Türü)
  async getWindowsServicesList() {
    try {
      const psCmd = `powershell -NoProfile -Command "Get-Service | Select-Object -First 30 Name, DisplayName, Status, StartType | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCmd);
      let data = JSON.parse(stdout || '[]');
      if (!Array.isArray(data)) data = [data];

      const list = data.map(s => ({
        name: s.Name,
        displayName: s.DisplayName || s.Name,
        status: s.Status === 4 ? 'Running' : 'Stopped',
        statusText: s.Status === 4 ? 'Running (Çalışıyor)' : 'Stopped (Durduruldu)',
        isRunning: s.Status === 4,
        startType: s.StartType === 2 ? 'Otomatik' : s.StartType === 3 ? 'Manuel' : 'Devre Dışı'
      }));

      return { success: true, services: list };
    } catch (e) {
      return { success: false, services: [] };
    }
  }

  // 2. Windows Servisi Kontrolü (Başlat / Durdur / Yeniden Başlat)
  async controlWindowsService(serviceName, action = 'restart') {
    try {
      const cleanName = serviceName.replace(/[^a-zA-Z0-9_-]/g, '');
      let cmd = '';
      if (action === 'start') cmd = `Start-Service -Name "${cleanName}" -ErrorAction SilentlyContinue`;
      else if (action === 'stop') cmd = `Stop-Service -Name "${cleanName}" -Force -ErrorAction SilentlyContinue`;
      else cmd = `Restart-Service -Name "${cleanName}" -Force -ErrorAction SilentlyContinue`;

      await execAsync(`powershell -NoProfile -Command "${cmd}"`);
      return { success: true, message: `${cleanName} servisi üzerinde '${action}' işlemi tamamlandı.` };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  // 3. Windows Sistem Onarımı (SFC & DISM)
  async runSystemFileCheck(tool = 'sfc') {
    try {
      if (tool === 'sfc') {
        const { stdout } = await execAsync('sfc /scannow', { timeout: 300000 });
        return { success: true, output: stdout || 'Sistem dosya bütünlüğü taraması tamamlandı.' };
      } else {
        const { stdout } = await execAsync('DISM /Online /Cleanup-Image /RestoreHealth', { timeout: 300000 });
        return { success: true, output: stdout || 'DISM imaj onarımı başarıyla tamamlandı.' };
      }
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  // 4. Güç Profili (Yüksek Performans Modu)
  async setHighPerformancePowerPlan() {
    try {
      // High performance GUID: 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
      await execAsync('powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c');
      return { success: true, message: 'Yüksek Performans güç profili etkinleştirildi.' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  // 5. Ayrıntılı Yerel Kullanıcılar ve Yetkiler
  async getUserAccountsDetailed() {
    try {
      const psCmd = `powershell -NoProfile -Command "Get-LocalUser | Select-Object Name, Enabled, PasswordRequired, Description | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCmd);
      let data = JSON.parse(stdout || '[]');
      if (!Array.isArray(data)) data = [data];

      const list = data.map(u => ({
        name: u.Name,
        enabled: u.Enabled !== false,
        isAdmin: u.Name.toLowerCase().includes('admin') || u.Name.toLowerCase() === 'administrator',
        description: u.Description || 'Yerel Kullanıcı Hesabı'
      }));

      return { success: true, users: list };
    } catch (e) {
      return { success: false, users: [] };
    }
  }
}

module.exports = AdminManager;
