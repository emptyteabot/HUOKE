# GuestSeek 桌面应用打包指南

## 方案选择

### 方案1: Electron + Streamlit (推荐)
将Streamlit应用打包到Electron中,提供原生桌面体验。

**优点**:
- 跨平台(Windows/Mac/Linux)
- 完整的桌面应用体验
- 可以访问本地文件系统
- 可以添加系统托盘、通知等功能

**缺点**:
- 包体积较大(~100MB)
- 需要同时维护Electron和Streamlit代码

### 方案2: PyInstaller
将Python应用直接打包成可执行文件。

**优点**:
- 简单直接
- 包体积较小
- 纯Python解决方案

**缺点**:
- 需要为每个平台单独打包
- UI体验不如Electron

### 方案3: Tauri (最新推荐)
使用Rust + Web技术栈,比Electron更轻量。

**优点**:
- 包体积小(~10MB)
- 性能好
- 安全性高

**缺点**:
- 需要学习Rust
- 生态相对较新

---

## 方案1实现: Electron + Streamlit

### 步骤1: 安装依赖

```bash
# 安装Node.js和npm
# 下载: https://nodejs.org/

# 创建Electron项目
mkdir guestseek-desktop
cd guestseek-desktop
npm init -y
npm install electron electron-builder --save-dev
```

### 步骤2: 创建Electron主进程

创建 `main.js`:

```javascript
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let streamlitProcess;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  // 启动Streamlit服务器
  const streamlitPath = path.join(__dirname, 'streamlit-app');
  streamlitProcess = spawn('streamlit', ['run', 'Home.py', '--server.port=8501', '--server.headless=true'], {
    cwd: streamlitPath,
    shell: true
  });

  // 等待Streamlit启动
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:8501');
  }, 3000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (streamlitProcess) {
    streamlitProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

### 步骤3: 配置package.json

```json
{
  "name": "guestseek",
  "version": "1.0.0",
  "description": "AI驱动的留学获客助手",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.guestseek.app",
    "productName": "GuestSeek",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "streamlit-app/**/*",
      "assets/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

### 步骤4: 打包Python环境

使用PyInstaller将Python环境打包:

```bash
# 安装PyInstaller
pip install pyinstaller

# 创建spec文件
pyi-makespec --onefile --windowed streamlit-app/Home.py

# 编辑spec文件,添加所有依赖

# 打包
pyinstaller Home.spec
```

### 步骤5: 构建应用

```bash
# Windows
npm run build:win

# Mac
npm run build:mac

# Linux
npm run build:linux
```

---

## 方案2实现: PyInstaller

### 步骤1: 创建启动脚本

创建 `launcher.py`:

```python
import os
import sys
import subprocess
import webbrowser
import time
from threading import Thread

def start_streamlit():
    """启动Streamlit服务器"""
    streamlit_path = os.path.join(os.path.dirname(__file__), 'streamlit-app', 'Home.py')
    subprocess.run([
        sys.executable, '-m', 'streamlit', 'run',
        streamlit_path,
        '--server.port=8501',
        '--server.headless=true',
        '--browser.gatherUsageStats=false'
    ])

def main():
    # 在后台启动Streamlit
    thread = Thread(target=start_streamlit, daemon=True)
    thread.start()

    # 等待服务器启动
    time.sleep(3)

    # 打开浏览器
    webbrowser.open('http://localhost:8501')

    # 保持运行
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("正在关闭...")

if __name__ == '__main__':
    main()
```

### 步骤2: 创建spec文件

创建 `guestseek.spec`:

```python
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('streamlit-app', 'streamlit-app'),
    ],
    hiddenimports=[
        'streamlit',
        'pandas',
        'plotly',
        'openai',
        'supabase',
        'sendgrid',
        'PIL',
        'jose',
        'passlib',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='GuestSeek',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/icon.ico'
)
```

### 步骤3: 打包

```bash
pyinstaller guestseek.spec
```

---

## 方案3实现: Tauri

### 步骤1: 安装Rust和Tauri CLI

```bash
# 安装Rust
# Windows: https://www.rust-lang.org/tools/install
# Mac/Linux: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装Tauri CLI
cargo install tauri-cli
```

### 步骤2: 创建Tauri项目

```bash
cargo tauri init
```

### 步骤3: 配置tauri.conf.json

```json
{
  "build": {
    "beforeDevCommand": "streamlit run streamlit-app/Home.py",
    "beforeBuildCommand": "",
    "devPath": "http://localhost:8501",
    "distDir": "../dist"
  },
  "package": {
    "productName": "GuestSeek",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.guestseek.app",
      "icon": [
        "icons/icon.png"
      ]
    },
    "windows": [
      {
        "title": "GuestSeek",
        "width": 1400,
        "height": 900
      }
    ]
  }
}
```

### 步骤4: 构建

```bash
cargo tauri build
```

---

## 推荐方案

**对于GuestSeek项目,推荐使用方案1 (Electron + Streamlit)**:

1. **跨平台支持好**: 一次开发,三平台运行
2. **开发效率高**: 不需要重写UI
3. **功能完整**: 可以添加系统托盘、自动更新等功能
4. **用户体验好**: 原生应用体验

---

## 自动更新

使用electron-updater实现自动更新:

```bash
npm install electron-updater
```

在main.js中添加:

```javascript
const { autoUpdater } = require('electron-updater');

app.on('ready', () => {
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
});
```

---

## 发布

### Windows
- 生成NSIS安装包
- 上传到GitHub Releases
- 用户下载安装

### Mac
- 生成DMG文件
- 代码签名(需要Apple Developer账号)
- 上传到GitHub Releases

### Linux
- 生成AppImage
- 上传到GitHub Releases

---

## 下一步

1. 选择打包方案
2. 准备应用图标(icon.ico/icon.icns/icon.png)
3. 配置打包脚本
4. 测试打包结果
5. 发布到GitHub Releases
6. 编写安装文档

---

## 注意事项

1. **数据库连接**: 桌面应用需要配置本地数据库或连接远程数据库
2. **环境变量**: 需要在应用中内置或让用户配置API Keys
3. **自动更新**: 建议实现自动更新功能
4. **错误日志**: 添加日志记录,方便调试
5. **性能优化**: 桌面应用启动速度很重要

---

## 成本估算

- **开发时间**: 2-3天
- **测试时间**: 1-2天
- **代码签名**:
  - Windows: $200/年 (Code Signing Certificate)
  - Mac: $99/年 (Apple Developer Program)
- **总计**: 约3-5天开发 + $300/年证书费用
