#!/bin/bash

echo "🚀 开始构建 GuestSeek 桌面应用..."

# 检查Node.js
echo ""
echo "检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js 版本: $NODE_VERSION"
else
    echo "❌ 未安装 Node.js,请先安装: https://nodejs.org/"
    exit 1
fi

# 检查Python
echo ""
echo "检查 Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python 版本: $PYTHON_VERSION"
else
    echo "❌ 未安装 Python,请先安装: https://www.python.org/"
    exit 1
fi

# 进入electron目录
cd electron

# 安装依赖
echo ""
echo "安装 Node.js 依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装成功"

# 检测操作系统并构建
echo ""
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "开始构建 Mac 应用..."
    npm run build:mac
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "开始构建 Linux 应用..."
    npm run build:linux
else
    echo "❌ 不支持的操作系统"
    exit 1
fi

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo ""
echo "✅ 构建成功!"
echo "📦 安装包位置: electron/dist/"

# 返回上级目录
cd ..

echo ""
echo "🎉 完成!"
