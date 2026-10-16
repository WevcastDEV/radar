const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let win;
function createWindow() {
  win = new BrowserWindow({ 
    width: 1440, 
    height: 900, 
    minWidth: 1100, 
    minHeight: 700, 
    webPreferences: { 
      preload: path.join(__dirname, 'preload.cjs'), 
      contextIsolation: true, 
      nodeIntegration: false 
    } 
  });

  // Remove menus for a cleaner app look
  win.setMenuBarVisibility(false);

  // Load the initial setup screen
  const indexPath = `file://${path.join(__dirname, 'index.html')}`;
  
  win.loadURL(indexPath);

  // If ANY network load fails (e.g. server offline or wrong IP), fallback to the setup screen with error
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // Ignore about:blank failures
    if (validatedURL === 'about:blank' || validatedURL.includes('file://')) return;
    
    console.log(`Failed to load ${validatedURL}: ${errorDescription}`);
    win.loadURL(`${indexPath}?failed=true`);
  });
}

app.whenReady().then(() => {
  createWindow();
  if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify();
});

autoUpdater.on('update-downloaded', () => { if (win) win.webContents.send('update-ready'); });
autoUpdater.on('error', (error) => console.error('[updater]', error.message));
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
