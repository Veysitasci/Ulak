const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class BluetoothManager {
  async getStatus() {
    try {
      const { stdout } = await execAsync('powershell "Get-PnpDevice -Class Bluetooth | Select-Object Status, FriendlyName"');
      const lines = stdout.split('\n');
      const devices = [];

      lines.forEach(line => {
        if (line.trim() && !line.includes('Status') && !line.includes('---')) {
          const parts = line.trim().split(/\s{2,}/);
          if (parts.length >= 2) {
            devices.push({
              name: parts[1],
              status: parts[0]
            });
          }
        }
      });

      const adapterEnabled = devices.some(d => d.status === 'OK');

      return {
        enabled: adapterEnabled,
        devices
      };
    } catch (error) {
      return { enabled: false, devices: [] };
    }
  }

  async enable() {
    try {
      await execAsync('powershell "Enable-PnpDevice -InstanceId (Get-PnpDevice -Class Bluetooth).InstanceId -Confirm:$false"');
      return { success: true, message: 'Bluetooth enabled' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async disable() {
    try {
      await execAsync('powershell "Disable-PnpDevice -InstanceId (Get-PnpDevice -Class Bluetooth).InstanceId -Confirm:$false"');
      return { success: true, message: 'Bluetooth disabled' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async scanDevices() {
    try {
      // This requires Windows 10/11 with Bluetooth LE support
      const { stdout } = await execAsync('powershell "Get-PnpDevice -Class Bluetooth | Where-Object {$_.Status -eq \'OK\'} | Select-Object FriendlyName"');
      const lines = stdout.split('\n');
      const devices = [];

      lines.forEach(line => {
        if (line.trim() && !line.includes('FriendlyName') && !line.includes('---')) {
          devices.push({
            name: line.trim(),
            connected: false,
            paired: true
          });
        }
      });

      return devices;
    } catch (error) {
      return [];
    }
  }

  async getPairedDevices() {
    try {
      const { stdout } = await execAsync('powershell "Get-PnpDevice -Class Bluetooth | Where-Object {$_.Status -eq \'OK\'} | Select-Object FriendlyName, InstanceId"');
      const lines = stdout.split('\n');
      const devices = [];

      lines.forEach(line => {
        if (line.trim() && !line.includes('FriendlyName') && !line.includes('---')) {
          const parts = line.trim().split(/\s{2,}/);
          if (parts.length >= 1) {
            const devId = parts[1] || parts[0];
            devices.push({
              name: parts[0],
              id: devId,
              deviceId: devId,
              connected: true
            });
          }
        }
      });

      return devices;
    } catch (error) {
      return [];
    }
  }

  async removeDevice(deviceId) {
    try {
      await execAsync(`powershell "Remove-PnpDevice -InstanceId '${deviceId}' -Confirm:$false"`);
      return { success: true, message: 'Device removed' };
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
}

module.exports = BluetoothManager;
