const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

function getNetworkDetails() {
  const subnets = new Set();
  const localIps = [];
  try {
    const ifaces = os.networkInterfaces();
    for (const dev in ifaces) {
      for (const details of ifaces[dev] || []) {
        if (details.family === 'IPv4' && !details.internal && !details.address.startsWith('169.254.')) {
          localIps.push(details.address);
          const parts = details.address.split('.');
          if (parts.length === 4) {
            subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error detecting network details:', err);
  }
  return {
    subnets: Array.from(subnets),
    localIps,
  };
}

contextBridge.exposeInMainWorld('radarDesktop', {
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback),
  getNetworkDetails: () => getNetworkDetails(),
});
