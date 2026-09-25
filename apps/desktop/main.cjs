const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let win;
function createWindow() {
  win = new BrowserWindow({ width: 1440, height: 900, minWidth: 1100, minHeight: 700, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } });
  const targetUrl = process.env.RADAR_WEB_URL || 'http://localhost:3000/login';
  const loadWithRetry = () => {
    win.loadURL(targetUrl).catch(() => {
      setTimeout(loadWithRetry, 1500);
    });
  };
  win.webContents.on('did-fail-load', () => {
    setTimeout(loadWithRetry, 1500);
  });
  loadWithRetry();
}
app.whenReady().then(() => {
  createWindow();
  if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify();
});
autoUpdater.on('update-downloaded', () => { if (win) win.webContents.send('update-ready'); });
autoUpdater.on('error', (error) => console.error('[updater]', error.message));
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
