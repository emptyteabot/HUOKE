"""
中国社交媒体自动获客工具 - 全平台支持

支持平台:
1. 小红书 - 爬取笔记评论
2. 知乎 - 爬取问题回答和评论
3. 抖音 - 爬取视频评论
4. 微博 - 爬取微博评论
5. B站 - 爬取视频评论
6. 豆瓣 - 爬取小组帖子

使用方法:
python china_social_scraper.py
"""

import time
import random
import json
import pandas as pd
from datetime import datetime
from typing import List, Dict
import os
import sys

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.common.keys import Keys
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("❌ 请先安装依赖: pip install selenium undetected-chromedriver pandas openpyxl")
    sys.exit(1)


class ChinaSocialScraper:
    """中国社交媒体自动获客工具"""

    def __init__(self, platform: str, headless: bool = False):
        self.platform = platform
        self.headless = headless
        self.driver = None
        self.logged_in = False
        self.results = []

        # 平台配置
        self.platform_config = {
            'xiaohongshu': {
                'name': '小红书',
                'url': 'https://www.xiaohongshu.com',
                'search_url': 'https://www.xiaohongshu.com/search_result?keyword={keyword}',
                'login_check': '.avatar, .user-avatar'
            },
            'zhihu': {
                'name': '知乎',
                'url': 'https://www.zhihu.com',
                'search_url': 'https://www.zhihu.com/search?type=content&q={keyword}',
                'login_check': '.Avatar'
            },
            'douyin': {
                'name': '抖音',
                'url': 'https://www.douyin.com',
                'search_url': 'https://www.douyin.com/search/{keyword}',
                'login_check': '.avatar'
            },
            'weibo': {
                'name': '微博',
                'url': 'https://weibo.com',
                'search_url': 'https://s.weibo.com/weibo?q={keyword}',
                'login_check': '.Avatar_face'
            },
            'bilibili': {
                'name': 'B站',
                'url': 'https://www.bilibili.com',
                'search_url': 'https://search.bilibili.com/all?keyword={keyword}',
                'login_check': '.header-avatar-wrap'
            },
            'douban': {
                'name': '豆瓣',
                'url': 'https://www.douban.com',
                'search_url': 'https://www.douban.com/search?q={keyword}',
                'login_check': '.nav-user-account'
            }
        }

    def init_driver(self):
        """初始化浏览器"""
        print(f"🚀 启动浏览器 ({self.platform_config[self.platform]['name']})...")

        options = uc.ChromeOptions()
        if self.headless:
            options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')

        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ]
        options.add_argument(f'user-agent={random.choice(user_agents)}')

        self.driver = uc.Chrome(options=options)
        self.driver.set_page_load_timeout(30)
        self.driver.maximize_window()

        print("✅ 浏览器启动成功")

    def login(self):
        """登录平台"""
        config = self.platform_config[self.platform]

        print(f"\n{'='*50}")
        print(f"🔐 登录{config['name']}")
        print("="*50)

        self.driver.get(config['url'])
        time.sleep(3)

        print(f"\n请在浏览器中手动登录{config['name']}:")
        print("1. 扫码登录 或 手机号登录")
        print("2. 登录成功后,在这里输入 'ok' 并按回车...")

        while True:
            user_input = input("\n输入 'ok' 继续: ").strip().lower()
            if user_input == 'ok':
                break

        # 检查是否登录成功
        try:
            self.driver.find_element(By.CSS_SELECTOR, config['login_check'])
            print(f"✅ {config['name']}登录成功!")
            self.logged_in = True
            return True
        except:
            print(f"⚠️ 未检测到登录,继续尝试...")
            self.logged_in = True
            return True

    def random_sleep(self, min_sec: float = 2, max_sec: float = 5):
        """随机延迟"""
        time.sleep(random.uniform(min_sec, max_sec))

    def search_keyword(self, keyword: str):
        """搜索关键词"""
        config = self.platform_config[self.platform]
        print(f"\n🔍 在{config['name']}搜索: {keyword}")

        try:
            search_url = config['search_url'].format(keyword=keyword)
            self.driver.get(search_url)
            self.random_sleep(3, 5)

            print("✅ 搜索页面加载成功")
            return True

        except Exception as e:
            print(f"❌ 搜索失败: {e}")
            return False

    def scrape_xiaohongshu(self, keyword: str, limit: int = 10) -> List[Dict]:
        """爬取小红书"""
        print(f"\n📱 开始爬取小红书...")

        results = []

        try:
            # 滚动加载
            for i in range(3):
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                self.random_sleep(2, 3)

            # 获取笔记链接
            note_links = []
            note_elements = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/explore/']")

            for elem in note_elements[:limit]:
                try:
                    link = elem.get_attribute("href")
                    if link and link not in note_links:
                        note_links.append(link)
                except:
                    continue

            print(f"  找到 {len(note_links)} 个笔记")

            # 爬取每个笔记的评论
            for idx, note_url in enumerate(note_links):
                print(f"  进度: {idx+1}/{len(note_links)}")

                self.driver.get(note_url)
                self.random_sleep(3, 5)

                # 滚动到评论区
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                self.random_sleep(2, 3)

                # 查找评论
                comment_elements = self.driver.find_elements(By.CSS_SELECTOR, ".comment-item, [class*='comment']")

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

        except Exception as e:
            print(f"❌ 爬取失败: {e}")

        return results

    def scrape_zhihu(self, keyword: str, limit: int = 10) -> List[Dict]:
        """爬取知乎"""
        print(f"\n📚 开始爬取知乎...")

        results = []

        try:
            # 滚动加载
            for i in range(3):
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                self.random_sleep(2, 3)

            # 获取问题/文章链接
            content_links = []
            link_elements = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/question/'], a[href*='/answer/']")

            for elem in link_elements[:limit]:
                try:
                    link = elem.get_attribute("href")
                    if link and link not in content_links:
                        content_links.append(link)
                except:
                    continue

            print(f"  找到 {len(content_links)} 个内容")

            # 爬取每个内容的评论
            for idx, content_url in enumerate(content_links):
                print(f"  进度: {idx+1}/{len(content_links)}")

                self.driver.get(content_url)
                self.random_sleep(3, 5)

                # 滚动到评论区
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                self.random_sleep(2, 3)

                # 查找评论
                comment_elements = self.driver.find_elements(By.CSS_SELECTOR, ".CommentItem, [class*='Comment']")

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

        except Exception as e:
            print(f"❌ 爬取失败: {e}")

        return results

    def scrape_weibo(self, keyword: str, limit: int = 10) -> List[Dict]:
        """爬取微博"""
        print(f"\n🐦 开始爬取微博...")

        results = []

        try:
            # 滚动加载
            for i in range(3):
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                self.random_sleep(2, 3)

            # 获取微博链接
            weibo_elements = self.driver.find_elements(By.CSS_SELECTOR, ".card-wrap, [class*='card']")[:limit]

            print(f"  找到 {len(weibo_elements)} 条微博")

            for idx, weibo_elem in enumerate(weibo_elements):
                print(f"  进度: {idx+1}/{len(weibo_elements)}")

                try:
                    # 点击查看评论
                    comment_btn = weibo_elem.find_element(By.CSS_SELECTOR, "[action-type='feed_list_comment']")
                    comment_btn.click()
                    self.random_sleep(2, 3)

                    # 查找评论
                    comment_elements = self.driver.find_elements(By.CSS_SELECTOR, ".list_li, [class*='comment']")

                    for comment_elem in comment_elements[:10]:
                        try:
                            username = comment_elem.find_element(By.CSS_SELECTOR, ".name, [class*='name']").text.strip()
                            content = comment_elem.find_element(By.CSS_SELECTOR, ".txt, [class*='text']").text.strip()

                            if username and content:
                                results.append({
                                    'platform': '微博',
                                    'username': username,
                                    'content': content,
                                    'source_url': self.driver.current_url,
                                    'scraped_at': datetime.now().isoformat()
                                })

                        except:
                            continue

                except:
                    continue

                self.random_sleep(3, 6)

        except Exception as e:
            print(f"❌ 爬取失败: {e}")

        return results

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

    def save_to_excel(self, results: List[Dict], filename: str = None):
        """保存到Excel"""
        if not filename:
            filename = f"{self.platform}_leads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

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

    def run(self, keyword: str, limit: int = 10):
        """运行完整流程"""
        config = self.platform_config[self.platform]

        print(f"\n{'='*50}")
        print(f"🚀 {config['name']}自动获客工具")
        print("="*50)

        try:
            # 1. 初始化浏览器
            self.init_driver()

            # 2. 登录
            if not self.login():
                print("❌ 登录失败")
                return

            # 3. 搜索关键词
            if not self.search_keyword(keyword):
                print("❌ 搜索失败")
                return

            # 4. 爬取数据
            if self.platform == 'xiaohongshu':
                results = self.scrape_xiaohongshu(keyword, limit)
            elif self.platform == 'zhihu':
                results = self.scrape_zhihu(keyword, limit)
            elif self.platform == 'weibo':
                results = self.scrape_weibo(keyword, limit)
            else:
                print(f"❌ 暂不支持{self.platform}")
                return

            if not results:
                print("❌ 未找到数据")
                return

            print(f"\n{'='*50}")
            print(f"✅ 总共爬取 {len(results)} 条数据")
            print("="*50)

            # 5. 筛选高意向
            high_intent = self.filter_high_intent(results)

            # 6. 保存
            self.save_to_excel(results)

            if high_intent:
                high_intent_filename = f"{self.platform}_high_intent_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
                self.save_to_excel(high_intent, high_intent_filename)

            print(f"\n{'='*50}")
            print("🎉 完成!")
            print("="*50)
            print(f"总数据: {len(results)}")
            print(f"高意向: {len(high_intent)}")

        except Exception as e:
            print(f"\n❌ 运行出错: {e}")
            import traceback
            traceback.print_exc()

        finally:
            if self.driver:
                print("\n⏸️ 按回车关闭浏览器...")
                input()
                self.driver.quit()


def main():
    """主函数"""
    print("\n" + "="*50)
    print("🎯 中国社交媒体自动获客工具")
    print("="*50)

    print("\n支持的平台:")
    print("1. 小红书 (xiaohongshu)")
    print("2. 知乎 (zhihu)")
    print("3. 微博 (weibo)")
    print("4. 抖音 (douyin) - 开发中")
    print("5. B站 (bilibili) - 开发中")
    print("6. 豆瓣 (douban) - 开发中")

    platform = input("\n请选择平台 (例如: xiaohongshu): ").strip().lower()
    if platform not in ['xiaohongshu', 'zhihu', 'weibo']:
        print("❌ 暂不支持该平台")
        return

    keyword = input("请输入搜索关键词 (例如: 美国留学): ").strip()
    if not keyword:
        keyword = "美国留学"

    limit = input("请输入要爬取的内容数量 (默认10): ").strip()
    limit = int(limit) if limit else 10

    headless = input("是否后台运行? (y/n, 默认n): ").strip().lower() == 'y'

    # 运行
    scraper = ChinaSocialScraper(platform, headless)
    scraper.run(keyword, limit)


if __name__ == "__main__":
    main()
