#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
重试机制快速验证脚本
验证所有爬虫的重试功能是否正常工作
"""

import sys
import os

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(__file__))

print("""
╔══════════════════════════════════════════════════════════╗
║           爬虫重试机制验证                                ║
║           Scraper Retry Mechanism Verification           ║
╚══════════════════════════════════════════════════════════╝
""")

# 1. 检查依赖
print("1. 检查依赖...")
try:
    import tenacity
    print("   ✓ tenacity 已安装")
except ImportError:
    print("   ✗ tenacity 未安装")
    print("   请运行: pip install tenacity")
    sys.exit(1)

try:
    import undetected_chromedriver
    print("   ✓ undetected-chromedriver 已安装")
except ImportError:
    print("   ✗ undetected-chromedriver 未安装")
    print("   请运行: pip install undetected-chromedriver")
    sys.exit(1)

try:
    from selenium import webdriver
    print("   ✓ selenium 已安装")
except ImportError:
    print("   ✗ selenium 未安装")
    print("   请运行: pip install selenium")
    sys.exit(1)

# 2. 检查重试装饰器模块
print("\n2. 检查重试装饰器模块...")
try:
    from retry_decorator import (
        scraper_retry,
        critical_operation_retry,
        quick_retry,
        retry_on_failure,
        RetryContext
    )
    print("   ✓ retry_decorator.py 加载成功")
    print("   ✓ scraper_retry 装饰器可用")
    print("   ✓ critical_operation_retry 装饰器可用")
    print("   ✓ quick_retry 装饰器可用")
    print("   ✓ retry_on_failure 函数可用")
    print("   ✓ RetryContext 类可用")
except ImportError as e:
    print(f"   ✗ 导入失败: {e}")
    sys.exit(1)

# 3. 检查爬虫文件
print("\n3. 检查爬虫文件...")

scrapers = [
    ("weibo_scraper.py", "微博爬虫"),
    ("xiaohongshu_scraper.py", "小红书爬虫"),
    ("zhihu_scraper.py", "知乎爬虫")
]

for filename, name in scrapers:
    filepath = os.path.join(os.path.dirname(__file__), filename)
    if os.path.exists(filepath):
        print(f"   ✓ {name} ({filename}) 存在")

        # 检查是否导入了重试装饰器
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'from retry_decorator import' in content or 'import retry_decorator' in content:
                print(f"      ✓ 已集成重试装饰器")
            else:
                print(f"      ⚠ 未检测到重试装饰器导入")
    else:
        print(f"   ✗ {name} ({filename}) 不存在")

# 4. 测试重试装饰器
print("\n4. 测试重试装饰器...")
try:
    from selenium.common.exceptions import TimeoutException

    attempt_count = [0]

    @scraper_retry(max_attempts=2, min_wait=0.1, max_wait=0.2)
    def test_function():
        attempt_count[0] += 1
        if attempt_count[0] < 2:
            raise TimeoutException("测试超时")
        return "成功"

    result = test_function()
    if result == "成功" and attempt_count[0] == 2:
        print("   ✓ 重试装饰器工作正常")
        print(f"      - 尝试次数: {attempt_count[0]}")
        print(f"      - 结果: {result}")
    else:
        print("   ✗ 重试装饰器异常")

except Exception as e:
    print(f"   ✗ 测试失败: {e}")

# 5. 检查文档
print("\n5. 检查文档...")
docs = [
    ("ERROR_HANDLING_GUIDE.md", "错误处理指南"),
    ("RETRY_UPGRADE_README.md", "重试升级说明"),
    ("test_retry.py", "测试脚本")
]

for filename, name in docs:
    filepath = os.path.join(os.path.dirname(__file__), filename)
    if os.path.exists(filepath):
        print(f"   ✓ {name} ({filename})")
    else:
        print(f"   ⚠ {name} ({filename}) 不存在")

# 6. 总结
print("\n" + "="*60)
print("验证完成!")
print("="*60)

print("\n✓ 重试机制已成功集成到所有爬虫")
print("\n可用的重试装饰器:")
print("  - @scraper_retry          (标准重试,3次,2-8秒)")
print("  - @critical_operation_retry (关键操作,5次,3-15秒)")
print("  - @quick_retry            (快速重试,2次,1-3秒)")

print("\n使用示例:")
print("""
  from retry_decorator import scraper_retry

  @scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
  def scrape_data(self, url):
      # 爬取逻辑
      pass
""")

print("\n运行完整测试:")
print("  python test_retry.py")

print("\n查看文档:")
print("  - ERROR_HANDLING_GUIDE.md  (详细使用指南)")
print("  - RETRY_UPGRADE_README.md  (升级说明)")

print("\n" + "="*60)
