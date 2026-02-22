#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微博爬虫测试脚本 - 验证代码可运行性
"""

def test_imports():
    """测试导入"""
    print("测试1: 检查依赖包...")
    try:
        import undetected_chromedriver as uc
        print("  ✅ undetected-chromedriver")
    except ImportError:
        print("  ❌ undetected-chromedriver 未安装")
        print("     运行: pip install undetected-chromedriver")
        return False
    
    try:
        from selenium import webdriver
        print("  ✅ selenium")
    except ImportError:
        print("  ❌ selenium 未安装")
        return False
    
    try:
        import pandas as pd
        print("  ✅ pandas")
    except ImportError:
        print("  ❌ pandas 未安装")
        return False
    
    try:
        import openpyxl
        print("  ✅ openpyxl")
    except ImportError:
        print("  ❌ openpyxl 未安装")
        return False
    
    return True


def test_scraper_class():
    """测试爬虫类"""
    print("\n测试2: 检查爬虫类...")
    try:
        from weibo_scraper import WeiboScraper
        print("  ✅ WeiboScraper 类导入成功")
        
        scraper = WeiboScraper(headless=True)
        print("  ✅ 实例化成功")
        
        # 检查方法
        methods = [
            'init_driver',
            'manual_login',
            'search_topic',
            'get_weibo_links',
            'scrape_comments',
            'extract_comment_info',
            'save_to_excel',
            'run'
        ]
        
        for method in methods:
            if hasattr(scraper, method):
                print(f"  ✅ {method}() 方法存在")
            else:
                print(f"  ❌ {method}() 方法缺失")
                return False
        
        return True
        
    except Exception as e:
        print(f"  ❌ 错误: {e}")
        return False


def test_chrome():
    """测试Chrome浏览器"""
    print("\n测试3: 检查Chrome浏览器...")
    try:
        import undetected_chromedriver as uc
        options = uc.ChromeOptions()
        options.add_argument('--headless=new')
        options.add_argument('--no-sandbox')
        
        driver = uc.Chrome(options=options, version_main=None)
        print("  ✅ Chrome驱动初始化成功")
        
        driver.get('https://www.baidu.com')
        print("  ✅ 网页访问正常")
        
        driver.quit()
        print("  ✅ 浏览器关闭正常")
        
        return True
        
    except Exception as e:
        print(f"  ❌ 错误: {e}")
        print("  提示: 确保已安装Chrome浏览器")
        return False


def main():
    """主测试函数"""
    print("""
╔══════════════════════════════════════════════════════════╗
║           微博爬虫测试                                   ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    results = []
    
    # 测试1: 依赖包
    results.append(test_imports())
    
    # 测试2: 爬虫类
    if results[0]:
        results.append(test_scraper_class())
    else:
        print("\n⚠️  跳过后续测试(依赖包未安装)")
        return
    
    # 测试3: Chrome浏览器
    if results[1]:
        print("\n⚠️  测试3需要Chrome浏览器,可能需要较长时间...")
        choice = input("是否测试Chrome? (y/n): ").strip().lower()
        if choice == 'y':
            results.append(test_chrome())
    
    # 总结
    print("\n" + "="*60)
    print("测试总结:")
    print("="*60)
    
    if all(results):
        print("✅ 所有测试通过!")
        print("\n可以开始使用爬虫:")
        print("  python weibo_scraper.py")
    else:
        print("❌ 部分测试失败")
        print("\n请先解决上述问题,然后重新测试")
    
    print("="*60)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  测试中断")
    except Exception as e:
        print(f"\n❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
