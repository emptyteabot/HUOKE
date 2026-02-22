#!/bin/bash

echo "========================================"
echo "小红书评论爬虫 - 快速启动"
echo "========================================"
echo ""

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未检测到Python3,请先安装"
    exit 1
fi

# 检查依赖
echo "[1/3] 检查依赖..."
if ! python3 -c "import undetected_chromedriver" 2>/dev/null; then
    echo "[安装] 正在安装依赖包..."
    pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖安装失败"
        exit 1
    fi
else
    echo "[完成] 依赖已安装"
fi

# 运行爬虫
echo ""
echo "[2/3] 启动爬虫..."
echo ""
python3 xiaohongshu_scraper.py

echo ""
echo "[3/3] 程序结束"
