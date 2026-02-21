const { app, BrowserWindow, Tray, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let streamlitProcess;
let mainWindow;
let tray;

// 检查Streamlit是否已安装
function checkStreamlit() {
  try {
    const { execSync } = require('child_process');
    execSync('streamlit --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// 启动Streamlit服务器
function startStreamlit() {
  const streamlitPath = path.join(__dirname, 'streamlit-app');
  const homePath = path.join(streamlitPath, 'Home.py');

  if (!fs.existsSync(homePath)) {
    console.error('Streamlit app not found:', homePath);
    return null;
  }

  console.log('Starting Streamlit server...');

  const process = spawn('streamlit', [
    'run',
    homePath,
    '--server.port=8501',
    '--server.headless=true',
    '--browser.gatherUsageStats=false',
    '--server.address=localhost'
  ], {
    cwd: streamlitPath,
    shell: true
  });

  process.stdout.on('data', (data) => {
    console.log(`Streamlit: ${data}`);
  });

  process.stderr.on('data', (data) => {
    console.error(`Streamlit Error: ${data}`);
  });

  return process;
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: 'GuestSeek - AI留学获客助手',
    show: false // 先不显示,等加载完成
  });

  // 窗口加载完成后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 启动Streamlit
  if (!checkStreamlit()) {
    mainWindow.loadFile('error.html'); // 显示错误页面
    return;
  }

  streamlitProcess = startStreamlit();

  if (!streamlitProcess) {
    mainWindow.loadFile('error.html');
    return;
  }

  // 等待Streamlit启动
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:8501');
  }, 5000);

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 创建菜单
  const menu = Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        {
          label: '刷新',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.reload();
            }
          }
        },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '查看',
      submenu: [
        {
          label: '开发者工具',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox({
              type: 'info',
              title: '关于 GuestSeek',
              message: 'GuestSeek v1.0.0',
              detail: 'AI驱动的留学获客助手\n\n© 2024 GuestSeek. All rights reserved.'
            });
          }
        },
        {
          label: '文档',
          click: () => {
            require('electron').shell.openExternal('https://github.com/emptyteabot/HUOKE');
          }
        }
      ]
    }
  ]);

  Menu.setApplicationMenu(menu);
}

// 创建系统托盘
function createTray() {
  const iconPath = path.join(__dirname, 'assets/tray-icon.png');

  if (fs.existsSync(iconPath)) {
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
          }
        }
      },
      {
        label: '退出',
        click: () => {
          app.quit();
        }
      }
    ]);

    tray.setToolTip('GuestSeek');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
      }
    });
  }
}

// 应用启动
app.on('ready', () => {
  createWindow();
  createTray();
});

// 所有窗口关闭
app.on('window-all-closed', () => {
  if (streamlitProcess) {
    streamlitProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 激活应用
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 应用退出前
app.on('before-quit', () => {
  if (streamlitProcess) {
    streamlitProcess.kill();
  }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
