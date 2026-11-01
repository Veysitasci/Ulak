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
}

module.exports = AdminManager;
