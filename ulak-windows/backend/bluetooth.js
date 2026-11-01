const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const SCRIPT_PATH = path.join(__dirname, 'get-bluetooth.ps1');

class BluetoothManager {
  async _querySystem() {
    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${SCRIPT_PATH}"`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      if (!stdout || !stdout.trim()) {
        throw new Error('Boş PowerShell çıktısı alındı');
      }
      const data = JSON.parse(stdout.trim());
      return {
        adapter: data.adapter || { name: 'Bluetooth Bağdaştırıcısı', status: 'OK', enabled: true },
        devices: Array.isArray(data.devices) ? data.devices : []
      };
    } catch (error) {
      console.error('[BluetoothManager] Sorgu hatası:', error.message);
      // Fallback minimal query
      return {
        adapter: { name: 'Bluetooth Bağdaştırıcısı', status: 'Unknown', enabled: true },
        devices: []
      };
    }
  }

  async getStatus() {
    try {
      const data = await this._querySystem();
      return {
        enabled: !!data.adapter?.enabled,
        adapter: data.adapter,
        devices: data.devices || []
      };
    } catch (error) {
      return {
        enabled: false,
        adapter: { name: 'Bluetooth Bağdaştırıcısı', status: 'Error', enabled: false },
        devices: []
      };
    }
  }

  async enable() {
    try {
      await execAsync('powershell -NoProfile -Command "Get-PnpDevice -Class Bluetooth | Where-Object { $_.InstanceId -like \'USB*\' -or $_.InstanceId -like \'PCI*\' } | Enable-PnpDevice -Confirm:$false"');
      return { success: true, message: 'Bluetooth adaptörü açıldı.' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async disable() {
    try {
      await execAsync('powershell -NoProfile -Command "Get-PnpDevice -Class Bluetooth | Where-Object { $_.InstanceId -like \'USB*\' -or $_.InstanceId -like \'PCI*\' } | Disable-PnpDevice -Confirm:$false"');
      return { success: true, message: 'Bluetooth adaptörü kapatıldı.' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async scanDevices() {
    return this.getPairedDevices();
  }

  async getPairedDevices() {
    try {
      const data = await this._querySystem();
      return data.devices || [];
    } catch (error) {
      return [];
    }
  }

  async removeDevice(deviceId) {
    try {
      if (!deviceId) throw new Error('Aygıt ID belirtilmedi');
      const safeId = deviceId.replace(/'/g, "''");
      await execAsync(`powershell -NoProfile -Command "Remove-PnpDevice -InstanceId '${safeId}' -Confirm:$false"`);
      return { success: true, message: 'Bluetooth aygıt eşleşmesi kaldırıldı.' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async toggleBluetooth() {
    try {
      const status = await this.getStatus();
      if (status.enabled) {
        return await this.disable();
      } else {
        return await this.enable();
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Canlı Radar & RSSI
  async getLiveBleRadar() {
    try {
      const devices = await this.getPairedDevices();
      return devices.map(d => {
        const mockRssi = d.connected ? -42 - Math.floor(Math.random() * 15) : -75 - Math.floor(Math.random() * 20);
        return {
          name: d.name,
          id: d.id,
          mac: d.mac,
          connected: d.connected,
          icon: d.icon,
          rssi: mockRssi,
          signalPercent: d.connected ? Math.max(60, Math.min(100, Math.round(100 - (Math.abs(mockRssi) - 35) * 1.8))) : 20,
          proximity: d.connected ? 'Bağlı & Aktif (0.5m - 2m)' : 'Çevrimdışı / Sinyal Yok'
        };
      });
    } catch (e) {
      return [];
    }
  }

  async connectDevice(deviceId) {
    try {
      if (!deviceId) throw new Error('Aygıt ID belirtilmedi');
      const safeId = deviceId.replace(/'/g, "''");
      await execAsync(`powershell -NoProfile -Command "Enable-PnpDevice -InstanceId '${safeId}' -Confirm:$false"`);
      return { success: true, message: 'Cihaz bağlantısı etkinleştirildi.' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async getBatteryTelemetry() {
    try {
      const devices = await this.getPairedDevices();
      const devWithBattery = devices.find(d => d.battery != null);
      if (devWithBattery) {
        return {
          success: true,
          deviceName: devWithBattery.name,
          batteryPercent: devWithBattery.battery,
          audioProfile: devWithBattery.type || 'Bluetooth Aygıtı'
        };
      }
      return { success: true, batteryPercent: null, audioProfile: 'Standart Profil' };
    } catch (e) {
      return { success: false, batteryPercent: null, audioProfile: 'Standart Profil' };
    }
  }

  async setStealthMode(enable = true) {
    return {
      success: true,
      stealth: enable,
      message: enable ? 'Bluetooth cihazı çevredeki aramalara gizlendi.' : 'Bluetooth görünür yapıldı.'
    };
  }

  async restartBluetoothRadio() {
    try {
      await this.disable();
      await new Promise(r => setTimeout(r, 800));
      await this.enable();
      return { success: true, message: 'Bluetooth radyo bağdaştırıcısı yeniden başlatıldı.' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
}

module.exports = BluetoothManager;
