const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class PackageManager {
  async searchPackage(query, source = 'winget') {
    try {
      if (source === 'winget') {
        const { stdout } = await execAsync(`winget search "${query}"`);
        return this.parseWingetSearch(stdout);
      } else if (source === 'choco') {
        const { stdout } = await execAsync(`choco search "${query}" --limit-output`);
        return this.parseChocoSearch(stdout);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  parseWingetSearch(output) {
    const lines = output.split('\n');
    const packages = [];

    lines.forEach(line => {
      if (line.trim() && !line.includes('Name') && !line.includes('---')) {
        const parts = line.trim().split(/\s{2,}/);
        if (parts.length >= 2) {
          packages.push({
            id: parts[0],
            name: parts[1],
            version: parts[2] || 'Unknown',
            source: 'winget'
          });
        }
      }
    });

    return packages;
  }

  parseChocoSearch(output) {
    const lines = output.split('\n');
    const packages = [];

    lines.forEach(line => {
      if (line.trim()) {
        const parts = line.split('|');
        if (parts.length >= 2) {
          packages.push({
            id: parts[0],
            name: parts[0],
            version: parts[1] || 'Unknown',
            source: 'choco'
          });
        }
      }
    });

    return packages;
  }

  async installPackage(packageId, source = 'winget') {
    try {
      if (source === 'winget') {
        await execAsync(`winget install --id ${packageId} --silent --accept-package-agreements --accept-source-agreements`);
        return { success: true, message: `Package ${packageId} installed` };
      } else if (source === 'choco') {
        await execAsync(`choco install ${packageId} -y`);
        return { success: true, message: `Package ${packageId} installed` };
      }
      return { success: false, message: 'Invalid source' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async uninstallPackage(packageId, source = 'winget') {
    try {
      if (source === 'winget') {
        await execAsync(`winget uninstall --id ${packageId} --silent`);
        return { success: true, message: `Package ${packageId} uninstalled` };
      } else if (source === 'choco') {
        await execAsync(`choco uninstall ${packageId} -y`);
        return { success: true, message: `Package ${packageId} uninstalled` };
      }
      return { success: false, message: 'Invalid source' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updatePackage(packageId, source = 'winget') {
    try {
      if (source === 'winget') {
        await execAsync(`winget upgrade --id ${packageId} --silent --accept-package-agreements --accept-source-agreements`);
        return { success: true, message: `Package ${packageId} updated` };
      } else if (source === 'choco') {
        await execAsync(`choco upgrade ${packageId} -y`);
        return { success: true, message: `Package ${packageId} updated` };
      }
      return { success: false, message: 'Invalid source' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getInstalledPackages(source = 'winget') {
    try {
      if (source === 'winget') {
        const { stdout } = await execAsync('winget list');
        return this.parseWingetList(stdout);
      } else if (source === 'choco') {
        const { stdout } = await execAsync('choco list --local-only');
        return this.parseChocoList(stdout);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  parseWingetList(output) {
    const lines = output.split('\n');
    const packages = [];

    lines.forEach(line => {
      if (line.trim() && !line.includes('Name') && !line.includes('---')) {
        const parts = line.trim().split(/\s{2,}/);
        if (parts.length >= 2) {
          packages.push({
            id: parts[0],
            name: parts[1],
            version: parts[2] || 'Unknown',
            source: 'winget'
          });
        }
      }
    });

    return packages;
  }

  parseChocoList(output) {
    const lines = output.split('\n');
    const packages = [];

    lines.forEach(line => {
      if (line.trim()) {
        const parts = line.split('|');
        if (parts.length >= 2) {
          packages.push({
            id: parts[0],
            name: parts[0],
            version: parts[1] || 'Unknown',
            source: 'choco'
          });
        }
      }
    });

    return packages;
  }

  async getUpdates(source = 'winget') {
    try {
      if (source === 'winget') {
        const { stdout } = await execAsync('winget upgrade');
        return this.parseWingetUpgrade(stdout);
      } else if (source === 'choco') {
        const { stdout } = await execAsync('choco outdated');
        return this.parseChocoOutdated(stdout);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  parseWingetUpgrade(output) {
    const lines = output.split('\n');
    const updates = [];

    lines.forEach(line => {
      if (line.trim() && !line.includes('Name') && !line.includes('---')) {
        const parts = line.trim().split(/\s{2,}/);
        if (parts.length >= 3) {
          updates.push({
            id: parts[0],
            name: parts[1],
            currentVersion: parts[2] || 'Unknown',
            newVersion: parts[3] || 'Unknown',
            source: 'winget'
          });
        }
      }
    });

    return updates;
  }

  parseChocoOutdated(output) {
    const lines = output.split('\n');
    const updates = [];

    lines.forEach(line => {
      if (line.trim()) {
        const parts = line.split('|');
        if (parts.length >= 3) {
          updates.push({
            id: parts[0],
            name: parts[0],
            currentVersion: parts[1] || 'Unknown',
            newVersion: parts[2] || 'Unknown',
            source: 'choco'
          });
        }
      }
    });

    return updates;
  }

  async checkSourceAvailability() {
    const sources = { winget: false, choco: false };

    try {
      await execAsync('winget --version');
      sources.winget = true;
    } catch (e) {}

    try {
      await execAsync('choco --version');
      sources.choco = true;
    } catch (e) {}

    return sources;
  }
}

module.exports = PackageManager;
