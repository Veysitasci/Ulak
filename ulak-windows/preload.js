const { contextBridge, ipcRenderer } = require('electron');

const ALLOWED_INVOKE_PREFIXES = [
  'window:',
  'system:',
  'wifi:',
  'firewall:',
  'bluetooth:',
  'package:',
  'cleaner:',
  'youtube:',
  'hacker:',
  'admin:',
  'antivirus:',
  'vault:',
  'netmon:',
  'backup:',
  'pkg:',
  'version:',
  'app:',
  'get-store-value',
  'set-store-value'
];

function isAllowed(channel) {
  return ALLOWED_INVOKE_PREFIXES.some(prefix => channel === prefix || channel.startsWith(prefix));
}

contextBridge.exposeInMainWorld('ulak', {
  invoke: (channel, ...args) => {
    if (isAllowed(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Korumalı kanal erişim engeli: ${channel}`));
  },
  on: (channel, listener) => {
    if (isAllowed(channel)) {
      const subscription = (_event, ...args) => listener(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  }
});
