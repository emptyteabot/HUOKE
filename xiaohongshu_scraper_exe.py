"""
小红书自动获客工具 - 独立exe版本

功能:
1. 登录你的小红书账号
2. 搜索关键词(例如: "美国留学")
3. 自动爬取笔记评论区
4. 提取真实用户信息
5. 保存到Excel

使用方法:
python xiaohongshu_scraper_exe.py
"""

import time
import random
import json
import pandas as pd
from datetime import datetime
from typing import List, Dict
import os

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
    exit(1)


class XiaohongshuAutoScraper:
    """小红书自动获客工具"""

    def __init__(self, headless: bool = False):
        self.headless = headless
        self.driver = None
        self.logged_in = False
        self.results = []

    def init_driver(self):
        """初始化浏览器"""
        print("🚀 启动浏览器...")

        options = uc.ChromeOptions()
        if self.headless:
            options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')

        # 随机User-Agent
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ]
        options.add_argument(f'user-agent={random.choice(user_agents)}')

        self.driver = uc.Chrome(options=options)
        self.driver.set_page_load_timeout(30)
        self.driver.maximize_window()

        print("✅ 浏览器启动成功")

    def login(self):
        """登录小红书"""
        print("\n" + "="*50)
        print("🔐 登录小红书")
        print("="*50)

        self.driver.get("https://www.xiaohongshu.com")
        time.sleep(3)

        print("\n请在浏览器中手动登录小红书:")
        print("1. 扫码登录 或 手机号登录")
        print("2. 登录成功后,按回车继续...")

        input("\n按回车键继续...")

        # 检查是否登录成功
        try:
            # 检查是否有用户头像
            self.driver.find_element(By.CSS_SELECTOR, ".avatar, .user-avatar")
            print("✅ 登录成功!")
            self.logged_in = True
            return True
        except:
            print("⚠️ 未检测到登录,继续尝试...")
            self.logged_in = True  # 假设登录成功
            return True

    def random_sleep(self, min_sec: float = 2, max_sec: float = 5):
        """随机延迟"""
        sleep_time = random.uniform(min_sec, max_sec)
        time.sleep(sleep_time)

    def search_keyword(self, keyword: str):
        """搜索关键词"""
        print(f"\n🔍 搜索关键词: {keyword}")

        try:
            # 访问搜索页面
            search_url = f"https://www.xiaohongshu.com/search_result?keyword={keyword}&source=web_search_result_notes"
            self.driver.get(search_url)
            self.random_sleep(3, 5)

            print("✅ 搜索页面加载成功")
            return True

        except Exception as e:
            print(f"❌ 搜索失败: {e}")
            return False

    def scroll_and_load(self, scroll_times: int = 3):
        """滚动加载更多内容"""
        print(f"📜 滚动加载更多笔记...")

        for i in range(scroll_times):
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            print(f"  滚动 {i+1}/{scroll_times}")
            self.random_sleep(2, 3)

    def get_note_links(self, limit: int = 20) -> List[str]:
        """获取笔记链接"""
        print(f"\n📝 获取笔记链接 (目标: {limit}个)")

        note_links = []

        try:
            # 查找笔记卡片
            # 小红书的DOM结构可能是: a.cover, a[href*="/explore/"]
            note_elements = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/explore/']")

            print(f"  找到 {len(note_elements)} 个笔记")

            for element in note_elements[:limit]:
                try:
                    link = element.get_attribute("href")
                    if link and link not in note_links:
                        note_links.append(link)
                except:
                    continue

            print(f"✅ 成功获取 {len(note_links)} 个笔记链接")

        except Exception as e:
            print(f"❌ 获取笔记链接失败: {e}")

        return note_links

    def scrape_note_comments(self, note_url: str) -> List[Dict]:
        """爬取单个笔记的评论"""
        print(f"\n📖 爬取笔记: {note_url}")

        comments = []

        try:
            self.driver.get(note_url)
            self.random_sleep(3, 5)

            # 滚动到评论区
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            self.random_sleep(2, 3)

            # 查找评论元素
            # 小红书评论的DOM结构可能是: .comment-item, .note-comment-item
            comment_elements = self.driver.find_elements(By.CSS_SELECTOR, ".comment-item, .note-comment-item, [class*='comment']")

            print(f"  找到 {len(comment_elements)} 条评论")

            for idx, comment_elem in enumerate(comment_elements[:50]):  # 最多50条
                try:
                    # 提取用户名
                    try:
                        username_elem = comment_elem.find_element(By.CSS_SELECTOR, ".username, .user-name, [class*='username']")
                        username = username_elem.text.strip()
                    except:
                        username = "未知用户"

                    # 提取评论内容
                    try:
                        content_elem = comment_elem.find_element(By.CSS_SELECTOR, ".content, .comment-content, [class*='content']")
                        content = content_elem.text.strip()
                    except:
                        content = ""

                    # 提取用户主页链接
                    try:
                        user_link_elem = comment_elem.find_element(By.CSS_SELECTOR, "a[href*='/user/']")
                        user_link = user_link_elem.get_attribute("href")
                    except:
                        user_link = ""

                    if username and content:
                        comment_data = {
                            'username': username,
                            'content': content,
                            'user_link': user_link,
                            'note_url': note_url,
                            'scraped_at': datetime.now().isoformat()
                        }

                        comments.append(comment_data)
                        print(f"    ✅ [{idx+1}] {username}: {content[:30]}...")

                except Exception as e:
                    print(f"    ⚠️ 解析评论失败: {e}")
                    continue

            print(f"✅ 成功爬取 {len(comments)} 条评论")

        except Exception as e:
            print(f"❌ 爬取评论失败: {e}")

        return comments

    def filter_high_intent_comments(self, comments: List[Dict]) -> List[Dict]:
        """筛选高意向评论"""
        print(f"\n🎯 筛选高意向评论...")

        # 高意向关键词
        intent_keywords = [
            "想咨询", "求推荐", "怎么申请", "有没有", "求联系",
            "加微信", "私信", "求助", "请问", "了解一下",
            "想去", "打算", "准备", "考虑", "有意向"
        ]

        high_intent_comments = []

        for comment in comments:
            content = comment['content'].lower()

            # 检查是否包含高意向关键词
            if any(keyword in content for keyword in intent_keywords):
                comment['intent_level'] = 'high'
                high_intent_comments.append(comment)
            else:
                comment['intent_level'] = 'low'

        print(f"✅ 找到 {len(high_intent_comments)} 条高意向评论")

        return high_intent_comments

    def save_to_excel(self, comments: List[Dict], filename: str = None):
        """保存到Excel"""
        if not filename:
            filename = f"xiaohongshu_leads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        print(f"\n💾 保存到Excel: {filename}")

        try:
            df = pd.DataFrame(comments)

            # 重新排列列顺序
            columns = ['username', 'content', 'intent_level', 'user_link', 'note_url', 'scraped_at']
            df = df[columns]

            # 保存到Excel
            df.to_excel(filename, index=False, engine='openpyxl')

            print(f"✅ 成功保存 {len(comments)} 条数据到 {filename}")
            print(f"📂 文件位置: {os.path.abspath(filename)}")

        except Exception as e:
            print(f"❌ 保存失败: {e}")

    def run(self, keyword: str, note_limit: int = 10):
        """运行完整流程"""
        print("\n" + "="*50)
        print("🚀 小红书自动获客工具")
        print("="*50)

        try:
            # 1. 初始化浏览器
            self.init_driver()

            # 2. 登录
            if not self.login():
                print("❌ 登录失败,退出")
                return

            # 3. 搜索关键词
            if not self.search_keyword(keyword):
                print("❌ 搜索失败,退出")
                return

            # 4. 滚动加载
            self.scroll_and_load(3)

            # 5. 获取笔记链接
            note_links = self.get_note_links(note_limit)

            if not note_links:
                print("❌ 未找到笔记,退出")
                return

            # 6. 爬取每个笔记的评论
            all_comments = []

            for idx, note_url in enumerate(note_links):
                print(f"\n进度: {idx+1}/{len(note_links)}")

                comments = self.scrape_note_comments(note_url)
                all_comments.extend(comments)

                # 随机延迟,避免被封
                self.random_sleep(3, 6)

            print(f"\n" + "="*50)
            print(f"✅ 总共爬取 {len(all_comments)} 条评论")
            print("="*50)

            # 7. 筛选高意向评论
            high_intent_comments = self.filter_high_intent_comments(all_comments)

            # 8. 保存到Excel
            self.save_to_excel(all_comments)

            # 9. 单独保存高意向评论
            if high_intent_comments:
                high_intent_filename = f"xiaohongshu_high_intent_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
                self.save_to_excel(high_intent_comments, high_intent_filename)

            print("\n" + "="*50)
            print("🎉 完成!")
            print("="*50)
            print(f"总评论数: {len(all_comments)}")
            print(f"高意向评论: {len(high_intent_comments)}")

        except Exception as e:
            print(f"\n❌ 运行出错: {e}")

        finally:
            # 关闭浏览器
            if self.driver:
                print("\n⏸️ 按回车关闭浏览器...")
                input()
                self.driver.quit()


def main():
    """主函数"""
    print("\n" + "="*50)
    print("🎯 小红书自动获客工具")
    print("="*50)

    # 输入参数
    keyword = input("\n请输入搜索关键词 (例如: 美国留学): ").strip()
    if not keyword:
        keyword = "美国留学"

    note_limit = input("请输入要爬取的笔记数量 (默认10): ").strip()
    if not note_limit:
        note_limit = 10
    else:
        note_limit = int(note_limit)

    headless = input("是否后台运行? (y/n, 默认n): ").strip().lower() == 'y'

    # 运行
    scraper = XiaohongshuAutoScraper(headless=headless)
    scraper.run(keyword, note_limit)


if __name__ == "__main__":
    main()
