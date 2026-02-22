"""
统一爬虫调度器 - 多平台并行抓取

支持平台:
1. 小红书
2. 知乎
3. 微博

功能:
- 多平台并行抓取
- 统一数据格式
- 自动去重合并
- 进度显示
- 错误重试
- 导出Excel报告
"""

import time
import random
import json
import pandas as pd
from datetime import datetime
from typing import List, Dict, Set
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from pathlib import Path

# 导入Cookie管理器
from cookie_manager import CookieManager

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("❌ 请先安装依赖: pip install selenium undetected-chromedriver pandas openpyxl")
    sys.exit(1)


class ScraperManager:
    """统一爬虫调度器"""

    def __init__(self, account: str = "default"):
        self.results = []
        self.results_lock = Lock()
        self.seen_users = set()  # 去重用
        self.platform_stats = {}
        self.account = account
        self.cookie_manager = CookieManager()

        # 平台配置
        self.platform_config = {
            'xiaohongshu': {
                'name': '小红书',
                'url': 'https://www.xiaohongshu.com',
                'search_url': 'https://www.xiaohongshu.com/search_result?keyword={keyword}',
                'login_check': '.avatar, .user-avatar',
                'enabled': True
            },
            'zhihu': {
                'name': '知乎',
                'url': 'https://www.zhihu.com',
                'search_url': 'https://www.zhihu.com/search?type=content&q={keyword}',
                'login_check': '.Avatar',
                'enabled': True
            },
            'weibo': {
                'name': '微博',
                'url': 'https://weibo.com',
                'search_url': 'https://s.weibo.com/weibo?q={keyword}',
                'login_check': '.Avatar_face',
                'enabled': True
            }
        }

    def init_driver(self, headless: bool = False):
        """初始化浏览器"""
        options = uc.ChromeOptions()
        if headless:
            options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')

        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ]
        options.add_argument(f'user-agent={random.choice(user_agents)}')

        driver = uc.Chrome(options=options)
        driver.set_page_load_timeout(30)
        driver.maximize_window()

        return driver

    def random_sleep(self, min_sec: float = 2, max_sec: float = 5):
        """随机延迟"""
        time.sleep(random.uniform(min_sec, max_sec))

    def login_platform(self, driver, platform: str) -> bool:
        """登录平台 - 支持Cookie自动登录"""
        config = self.platform_config[platform]

        print(f"\n{'='*50}")
        print(f"🔐 登录{config['name']}")
        print("="*50)

        # 尝试使用Cookie登录
        print("检查已保存的Cookie...")
        if self.cookie_manager.is_valid(driver, platform, self.account):
            print(f"✅ {config['name']} Cookie有效,自动登录成功!")
            return True

        print("Cookie无效或不存在,需要手动登录")

        driver.get(config['url'])
        time.sleep(3)

        print(f"\n请在浏览器中手动登录{config['name']}:")
        print("1. 扫码登录 或 手机号登录")
        print("2. 登录成功后,输入 'ok' 并按回车...")

        while True:
            user_input = input("\n输入 'ok' 继续: ").strip().lower()
            if user_input == 'ok':
                break

        try:
            driver.find_element(By.CSS_SELECTOR, config['login_check'])
            print(f"✅ {config['name']}登录成功!")

            # 保存Cookie
            cookies = driver.get_cookies()
            if self.cookie_manager.save_cookies(platform, self.account, cookies):
                print(f"✅ Cookie已保存,下次将自动登录")

            return True
        except:
            print(f"⚠️ 未检测到登录,继续尝试...")
            return True

    def scrape_xiaohongshu(self, keyword: str, limit: int, max_retries: int = 3) -> List[Dict]:
        """爬取小红书"""
        platform = 'xiaohongshu'
        results = []
        driver = None

        for attempt in range(max_retries):
            try:
                print(f"\n📱 [{self.platform_config[platform]['name']}] 开始爬取 (尝试 {attempt+1}/{max_retries})")

                driver = self.init_driver()

                if not self.login_platform(driver, platform):
                    continue

                # 搜索
                search_url = self.platform_config[platform]['search_url'].format(keyword=keyword)
                driver.get(search_url)
                self.random_sleep(3, 5)

                # 滚动加载
                for i in range(3):
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    self.random_sleep(2, 3)

                # 获取笔记链接
                note_links = []
                note_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/explore/']")

                for elem in note_elements[:limit]:
                    try:
                        link = elem.get_attribute("href")
                        if link and link not in note_links:
                            note_links.append(link)
                    except:
                        continue

                print(f"  找到 {len(note_links)} 个笔记")

                # 爬取评论
                for idx, note_url in enumerate(note_links):
                    print(f"  进度: {idx+1}/{len(note_links)}")

                    driver.get(note_url)
                    self.random_sleep(3, 5)

                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    self.random_sleep(2, 3)

                    comment_elements = driver.find_elements(By.CSS_SELECTOR, ".comment-item, [class*='comment']")

                    for comment_elem in comment_elements[:20]:
                        try:
                            username = comment_elem.find_element(By.CSS_SELECTOR, ".username, [class*='username']").text.strip()
                            content = comment_elem.find_element(By.CSS_SELECTOR, ".content, [class*='content']").text.strip()

                            if username and content:
                                results.append({
                                    'platform': '小红书',
                                    'username': username,
                                    'content': content,
                                    'source_url': note_url,
                                    'scraped_at': datetime.now().isoformat()
                                })
                        except:
                            continue

                    self.random_sleep(3, 6)

                print(f"✅ [{self.platform_config[platform]['name']}] 成功爬取 {len(results)} 条数据")
                break

            except Exception as e:
                print(f"❌ [{self.platform_config[platform]['name']}] 爬取失败 (尝试 {attempt+1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    print(f"❌ [{self.platform_config[platform]['name']}] 达到最大重试次数,放弃")

            finally:
                if driver:
                    driver.quit()

        return results

    def scrape_zhihu(self, keyword: str, limit: int, max_retries: int = 3) -> List[Dict]:
        """爬取知乎"""
        platform = 'zhihu'
        results = []
        driver = None

        for attempt in range(max_retries):
            try:
                print(f"\n📚 [{self.platform_config[platform]['name']}] 开始爬取 (尝试 {attempt+1}/{max_retries})")

                driver = self.init_driver()

                if not self.login_platform(driver, platform):
                    continue

                # 搜索
                search_url = self.platform_config[platform]['search_url'].format(keyword=keyword)
                driver.get(search_url)
                self.random_sleep(3, 5)

                # 滚动加载
                for i in range(3):
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    self.random_sleep(2, 3)

                # 获取内容链接
                content_links = []
                link_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/question/'], a[href*='/answer/']")

                for elem in link_elements[:limit]:
                    try:
                        link = elem.get_attribute("href")
                        if link and link not in content_links:
                            content_links.append(link)
                    except:
                        continue

                print(f"  找到 {len(content_links)} 个内容")

                # 爬取评论
                for idx, content_url in enumerate(content_links):
                    print(f"  进度: {idx+1}/{len(content_links)}")

                    driver.get(content_url)
                    self.random_sleep(3, 5)

                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    self.random_sleep(2, 3)

                    comment_elements = driver.find_elements(By.CSS_SELECTOR, ".CommentItem, [class*='Comment']")

                    for comment_elem in comment_elements[:20]:
                        try:
                            username = comment_elem.find_element(By.CSS_SELECTOR, ".UserLink, [class*='UserLink']").text.strip()
                            content = comment_elem.find_element(By.CSS_SELECTOR, ".CommentContent, [class*='Content']").text.strip()

                            if username and content:
                                results.append({
                                    'platform': '知乎',
                                    'username': username,
                                    'content': content,
                                    'source_url': content_url,
                                    'scraped_at': datetime.now().isoformat()
                                })
                        except:
                            continue

                    self.random_sleep(3, 6)

                print(f"✅ [{self.platform_config[platform]['name']}] 成功爬取 {len(results)} 条数据")
                break

            except Exception as e:
                print(f"❌ [{self.platform_config[platform]['name']}] 爬取失败 (尝试 {attempt+1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    print(f"❌ [{self.platform_config[platform]['name']}] 达到最大重试次数,放弃")

            finally:
                if driver:
                    driver.quit()

        return results

    def scrape_weibo(self, keyword: str, limit: int, max_retries: int = 3) -> List[Dict]:
        """爬取微博"""
        platform = 'weibo'
        results = []
        driver = None

        for attempt in range(max_retries):
            try:
                print(f"\n🐦 [{self.platform_config[platform]['name']}] 开始爬取 (尝试 {attempt+1}/{max_retries})")

                driver = self.init_driver()

                if not self.login_platform(driver, platform):
                    continue

                # 搜索
                search_url = self.platform_config[platform]['search_url'].format(keyword=keyword)
                driver.get(search_url)
                self.random_sleep(3, 5)

                # 滚动加载
                for i in range(3):
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    self.random_sleep(2, 3)

                # 获取微博
                weibo_elements = driver.find_elements(By.CSS_SELECTOR, ".card-wrap, [class*='card']")[:limit]

                print(f"  找到 {len(weibo_elements)} 条微博")

                for idx, weibo_elem in enumerate(weibo_elements):
                    print(f"  进度: {idx+1}/{len(weibo_elements)}")

                    try:
                        comment_btn = weibo_elem.find_element(By.CSS_SELECTOR, "[action-type='feed_list_comment']")
                        comment_btn.click()
                        self.random_sleep(2, 3)

                        comment_elements = driver.find_elements(By.CSS_SELECTOR, ".list_li, [class*='comment']")

                        for comment_elem in comment_elements[:10]:
                            try:
                                username = comment_elem.find_element(By.CSS_SELECTOR, ".name, [class*='name']").text.strip()
                                content = comment_elem.find_element(By.CSS_SELECTOR, ".txt, [class*='text']").text.strip()

                                if username and content:
                                    results.append({
                                        'platform': '微博',
                                        'username': username,
                                        'content': content,
                                        'source_url': driver.current_url,
                                        'scraped_at': datetime.now().isoformat()
                                    })
                            except:
                                continue
                    except:
                        continue

                    self.random_sleep(3, 6)

                print(f"✅ [{self.platform_config[platform]['name']}] 成功爬取 {len(results)} 条数据")
                break

            except Exception as e:
                print(f"❌ [{self.platform_config[platform]['name']}] 爬取失败 (尝试 {attempt+1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    print(f"❌ [{self.platform_config[platform]['name']}] 达到最大重试次数,放弃")

            finally:
                if driver:
                    driver.quit()

        return results

    def scrape_platform(self, platform: str, keyword: str, limit: int) -> List[Dict]:
        """调度单个平台爬虫"""
        if platform == 'xiaohongshu':
            return self.scrape_xiaohongshu(keyword, limit)
        elif platform == 'zhihu':
            return self.scrape_zhihu(keyword, limit)
        elif platform == 'weibo':
            return self.scrape_weibo(keyword, limit)
        else:
            print(f"❌ 不支持的平台: {platform}")
            return []

    def deduplicate_results(self, results: List[Dict]) -> List[Dict]:
        """去重"""
        print(f"\n🔄 数据去重...")

        seen = set()
        unique_results = []

        for item in results:
            key = (item['platform'], item['username'], item['content'])
            if key not in seen:
                seen.add(key)
                unique_results.append(item)

        removed = len(results) - len(unique_results)
        print(f"✅ 去重完成: 移除 {removed} 条重复数据")

        return unique_results

    def filter_high_intent(self, results: List[Dict]) -> List[Dict]:
        """筛选高意向用户"""
        print(f"\n🎯 筛选高意向用户...")

        intent_keywords = [
            "想咨询", "求推荐", "怎么申请", "有没有", "求联系",
            "加微信", "私信", "求助", "请问", "了解一下",
            "想去", "打算", "准备", "考虑", "有意向",
            "求介绍", "求分享", "想知道", "求问", "有人知道吗"
        ]

        high_intent = []

        for item in results:
            content = item['content'].lower()

            if any(keyword in content for keyword in intent_keywords):
                item['intent_level'] = 'high'
                high_intent.append(item)
            else:
                item['intent_level'] = 'low'

        print(f"✅ 找到 {len(high_intent)} 个高意向用户")

        return high_intent

    def save_to_excel(self, results: List[Dict], filename: str):
        """保存到Excel"""
        print(f"\n💾 保存到Excel: {filename}")

        try:
            df = pd.DataFrame(results)

            columns = ['platform', 'username', 'content', 'intent_level', 'source_url', 'scraped_at']
            df = df[columns]

            df.to_excel(filename, index=False, engine='openpyxl')

            print(f"✅ 成功保存 {len(results)} 条数据")
            print(f"📂 文件位置: {os.path.abspath(filename)}")

        except Exception as e:
            print(f"❌ 保存失败: {e}")

    def generate_report(self, results: List[Dict], high_intent: List[Dict]):
        """生成统计报告"""
        print(f"\n{'='*50}")
        print("📊 统计报告")
        print("="*50)

        # 按平台统计
        platform_counts = {}
        for item in results:
            platform = item['platform']
            platform_counts[platform] = platform_counts.get(platform, 0) + 1

        print("\n各平台数据量:")
        for platform, count in platform_counts.items():
            print(f"  {platform}: {count} 条")

        print(f"\n总数据量: {len(results)} 条")
        print(f"高意向用户: {len(high_intent)} 条")
        print(f"高意向占比: {len(high_intent)/len(results)*100:.1f}%")

    def run(self, platforms: List[str], keyword: str, limit: int = 10):
        """运行多平台爬虫"""
        print(f"\n{'='*50}")
        print("🚀 统一爬虫调度器")
        print("="*50)
        print(f"关键词: {keyword}")
        print(f"平台: {', '.join([self.platform_config[p]['name'] for p in platforms])}")
        print(f"每平台数量: {limit}")

        all_results = []

        # 串行执行(避免浏览器冲突)
        for platform in platforms:
            if platform in self.platform_config:
                results = self.scrape_platform(platform, keyword, limit)
                all_results.extend(results)

                # 保存中间结果
                with self.results_lock:
                    self.results.extend(results)

        if not all_results:
            print("\n❌ 未获取到任何数据")
            return

        # 去重
        unique_results = self.deduplicate_results(all_results)

        # 筛选高意向
        high_intent = self.filter_high_intent(unique_results)

        # 保存结果
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # 保存全部数据
        all_filename = f"multi_platform_all_{timestamp}.xlsx"
        self.save_to_excel(unique_results, all_filename)

        # 保存高意向数据
        if high_intent:
            high_intent_filename = f"multi_platform_high_intent_{timestamp}.xlsx"
            self.save_to_excel(high_intent, high_intent_filename)

        # 生成报告
        self.generate_report(unique_results, high_intent)

        print(f"\n{'='*50}")
        print("🎉 完成!")
        print("="*50)


def main():
    """主函数"""
    print("\n" + "="*50)
    print("🎯 统一爬虫调度器")
    print("="*50)

    print("\n支持的平台:")
    print("1. xiaohongshu - 小红书")
    print("2. zhihu - 知乎")
    print("3. weibo - 微博")

    # 选择平台
    platform_input = input("\n请选择平台 (多个用逗号分隔, 例如: xiaohongshu,zhihu): ").strip().lower()
    platforms = [p.strip() for p in platform_input.split(',')]

    # 验证平台
    valid_platforms = ['xiaohongshu', 'zhihu', 'weibo']
    platforms = [p for p in platforms if p in valid_platforms]

    if not platforms:
        print("❌ 未选择有效平台")
        return

    # 输入关键词
    keyword = input("\n请输入搜索关键词 (例如: 美国留学): ").strip()
    if not keyword:
        keyword = "美国留学"

    # 输入数量
    limit = input("\n请输入每个平台要爬取的内容数量 (默认10): ").strip()
    limit = int(limit) if limit else 10

    # 运行
    manager = ScraperManager()
    manager.run(platforms, keyword, limit)


if __name__ == "__main__":
    main()
