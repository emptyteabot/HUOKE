"""
真实的多平台数据抓取模块

使用Selenium + 反检测技术实现真实的数据抓取
支持: LinkedIn, 小红书, 知乎

注意: 需要安装 selenium, undetected-chromedriver
pip install selenium undetected-chromedriver
"""

import time
import random
import json
from typing import Dict, List, Optional
from datetime import datetime
import re

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("⚠️ Selenium未安装,请运行: pip install selenium undetected-chromedriver")


class BaseScraper:
    """基础爬虫类"""

    def __init__(self, headless: bool = True):
        self.headless = headless
        self.driver = None

    def init_driver(self):
        """初始化浏览器"""
        if not SELENIUM_AVAILABLE:
            raise ImportError("请先安装: pip install selenium undetected-chromedriver")

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

    def random_sleep(self, min_sec: float = 1, max_sec: float = 3):
        """随机延迟,模拟人类行为"""
        time.sleep(random.uniform(min_sec, max_sec))

    def close(self):
        """关闭浏览器"""
        if self.driver:
            self.driver.quit()

    def __enter__(self):
        self.init_driver()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class XiaohongshuScraper(BaseScraper):
    """小红书真实抓取"""

    def __init__(self, headless: bool = True):
        super().__init__(headless)
        self.base_url = "https://www.xiaohongshu.com"

    def search_notes(self, keywords: str, limit: int = 20) -> List[Dict]:
        """
        搜索小红书笔记

        Args:
            keywords: 搜索关键词(例如: "美国留学")
            limit: 返回数量

        Returns:
            List[Dict]: 笔记列表
        """
        if not self.driver:
            self.init_driver()

        results = []

        try:
            # 访问搜索页面
            search_url = f"{self.base_url}/search_result?keyword={keywords}&source=web_search_result_notes"
            print(f"🔍 正在搜索小红书: {keywords}")
            self.driver.get(search_url)
            self.random_sleep(3, 5)

            # 滚动加载更多内容
            for _ in range(3):
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                self.random_sleep(2, 3)

            # 查找笔记卡片
            # 小红书的DOM结构: section.note-item
            note_elements = self.driver.find_elements(By.CSS_SELECTOR, "section.note-item, div.note-item")

            print(f"📝 找到 {len(note_elements)} 条笔记")

            for idx, note in enumerate(note_elements[:limit]):
                try:
                    # 提取标题
                    title_elem = note.find_element(By.CSS_SELECTOR, ".title, .note-title")
                    title = title_elem.text.strip()

                    # 提取作者
                    try:
                        author_elem = note.find_element(By.CSS_SELECTOR, ".author, .username")
                        author = author_elem.text.strip()
                    except:
                        author = "未知用户"

                    # 提取链接
                    try:
                        link_elem = note.find_element(By.CSS_SELECTOR, "a")
                        note_url = link_elem.get_attribute("href")
                        if not note_url.startswith("http"):
                            note_url = self.base_url + note_url
                    except:
                        note_url = ""

                    # 提取互动数据
                    try:
                        likes_elem = note.find_element(By.CSS_SELECTOR, ".like-count, .likes")
                        likes = int(re.sub(r'\D', '', likes_elem.text))
                    except:
                        likes = 0

                    results.append({
                        'title': title,
                        'author': author,
                        'url': note_url,
                        'likes': likes,
                        'source': 'xiaohongshu',
                        'keywords': keywords,
                        'scraped_at': datetime.now().isoformat()
                    })

                    print(f"  ✅ [{idx+1}] {title[:30]}... - {author}")

                except Exception as e:
                    print(f"  ⚠️ 解析笔记失败: {e}")
                    continue

            print(f"✅ 成功抓取 {len(results)} 条小红书笔记")

        except Exception as e:
            print(f"❌ 小红书抓取失败: {e}")

        return results

    def get_note_detail(self, note_url: str) -> Dict:
        """获取笔记详情"""
        if not self.driver:
            self.init_driver()

        try:
            self.driver.get(note_url)
            self.random_sleep(2, 4)

            # 提取详细内容
            content_elem = self.driver.find_element(By.CSS_SELECTOR, ".content, .note-content")
            content = content_elem.text.strip()

            # 提取评论
            comments = []
            comment_elements = self.driver.find_elements(By.CSS_SELECTOR, ".comment-item")

            for comment in comment_elements[:10]:  # 只取前10条评论
                try:
                    author = comment.find_element(By.CSS_SELECTOR, ".username").text
                    text = comment.find_element(By.CSS_SELECTOR, ".comment-text").text
                    comments.append({'author': author, 'text': text})
                except:
                    continue

            return {
                'content': content,
                'comments': comments,
                'scraped_at': datetime.now().isoformat()
            }

        except Exception as e:
            print(f"❌ 获取笔记详情失败: {e}")
            return {}


class LinkedInScraper(BaseScraper):
    """LinkedIn真实抓取 (需要登录)"""

    def __init__(self, email: str = "", password: str = "", headless: bool = True):
        super().__init__(headless)
        self.email = email
        self.password = password
        self.base_url = "https://www.linkedin.com"
        self.logged_in = False

    def login(self):
        """登录LinkedIn"""
        if not self.driver:
            self.init_driver()

        if not self.email or not self.password:
            print("⚠️ 未提供LinkedIn账号,将使用公开搜索(数据有限)")
            return False

        try:
            print("🔐 正在登录LinkedIn...")
            self.driver.get(f"{self.base_url}/login")
            self.random_sleep(2, 3)

            # 输入邮箱
            email_input = self.driver.find_element(By.ID, "username")
            email_input.send_keys(self.email)
            self.random_sleep(0.5, 1)

            # 输入密码
            password_input = self.driver.find_element(By.ID, "password")
            password_input.send_keys(self.password)
            self.random_sleep(0.5, 1)

            # 点击登录
            login_btn = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            login_btn.click()
            self.random_sleep(3, 5)

            # 检查是否登录成功
            if "feed" in self.driver.current_url or "mynetwork" in self.driver.current_url:
                print("✅ LinkedIn登录成功")
                self.logged_in = True
                return True
            else:
                print("❌ LinkedIn登录失败")
                return False

        except Exception as e:
            print(f"❌ LinkedIn登录失败: {e}")
            return False

    def search_people(self, keywords: str, location: str = "", limit: int = 20) -> List[Dict]:
        """
        搜索LinkedIn用户

        Args:
            keywords: 搜索关键词(例如: "study abroad consultant")
            location: 地区
            limit: 返回数量

        Returns:
            List[Dict]: 用户列表
        """
        if not self.driver:
            self.init_driver()

        # 如果未登录,尝试登录
        if not self.logged_in:
            self.login()

        results = []

        try:
            # 构建搜索URL
            search_url = f"{self.base_url}/search/results/people/?keywords={keywords}"
            if location:
                search_url += f"&location={location}"

            print(f"🔍 正在搜索LinkedIn: {keywords}")
            self.driver.get(search_url)
            self.random_sleep(3, 5)

            # 滚动加载更多
            for _ in range(3):
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                self.random_sleep(2, 3)

            # 查找人员卡片
            person_elements = self.driver.find_elements(By.CSS_SELECTOR, ".entity-result, .reusable-search__result-container")

            print(f"👥 找到 {len(person_elements)} 个用户")

            for idx, person in enumerate(person_elements[:limit]):
                try:
                    # 提取姓名
                    name_elem = person.find_element(By.CSS_SELECTOR, ".entity-result__title-text a, .app-aware-link")
                    name = name_elem.text.strip()
                    profile_url = name_elem.get_attribute("href")

                    # 提取职位
                    try:
                        title_elem = person.find_element(By.CSS_SELECTOR, ".entity-result__primary-subtitle")
                        title = title_elem.text.strip()
                    except:
                        title = ""

                    # 提取公司
                    try:
                        company_elem = person.find_element(By.CSS_SELECTOR, ".entity-result__secondary-subtitle")
                        company = company_elem.text.strip()
                    except:
                        company = ""

                    # 提取地区
                    try:
                        location_elem = person.find_element(By.CSS_SELECTOR, ".entity-result__location")
                        loc = location_elem.text.strip()
                    except:
                        loc = location

                    results.append({
                        'name': name,
                        'title': title,
                        'company': company,
                        'location': loc,
                        'profile_url': profile_url,
                        'source': 'linkedin',
                        'keywords': keywords,
                        'scraped_at': datetime.now().isoformat()
                    })

                    print(f"  ✅ [{idx+1}] {name} - {title} @ {company}")

                except Exception as e:
                    print(f"  ⚠️ 解析用户失败: {e}")
                    continue

            print(f"✅ 成功抓取 {len(results)} 个LinkedIn用户")

        except Exception as e:
            print(f"❌ LinkedIn抓取失败: {e}")

        return results


class ZhihuScraper(BaseScraper):
    """知乎真实抓取"""

    def __init__(self, headless: bool = True):
        super().__init__(headless)
        self.base_url = "https://www.zhihu.com"

    def search_questions(self, keywords: str, limit: int = 20) -> List[Dict]:
        """
        搜索知乎问题

        Args:
            keywords: 搜索关键词(例如: "美国留学")
            limit: 返回数量

        Returns:
            List[Dict]: 问题列表
        """
        if not self.driver:
            self.init_driver()

        results = []

        try:
            # 访问搜索页面
            search_url = f"{self.base_url}/search?type=content&q={keywords}"
            print(f"🔍 正在搜索知乎: {keywords}")
            self.driver.get(search_url)
            self.random_sleep(3, 5)

            # 滚动加载
            for _ in range(3):
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                self.random_sleep(2, 3)

            # 查找问题卡片
            question_elements = self.driver.find_elements(By.CSS_SELECTOR, ".List-item, .SearchResult-Card")

            print(f"❓ 找到 {len(question_elements)} 个问题")

            for idx, question in enumerate(question_elements[:limit]):
                try:
                    # 提取标题
                    title_elem = question.find_element(By.CSS_SELECTOR, ".ContentItem-title a, h2 a")
                    title = title_elem.text.strip()
                    question_url = title_elem.get_attribute("href")

                    # 提取摘要
                    try:
                        summary_elem = question.find_element(By.CSS_SELECTOR, ".RichContent-inner, .SearchItem-meta")
                        summary = summary_elem.text.strip()[:200]
                    except:
                        summary = ""

                    # 提取互动数据
                    try:
                        meta_elem = question.find_element(By.CSS_SELECTOR, ".ContentItem-meta")
                        meta_text = meta_elem.text
                        # 提取关注数和回答数
                        followers = re.search(r'(\d+)\s*关注', meta_text)
                        answers = re.search(r'(\d+)\s*回答', meta_text)

                        follower_count = int(followers.group(1)) if followers else 0
                        answer_count = int(answers.group(1)) if answers else 0
                    except:
                        follower_count = 0
                        answer_count = 0

                    results.append({
                        'title': title,
                        'summary': summary,
                        'url': question_url,
                        'follower_count': follower_count,
                        'answer_count': answer_count,
                        'source': 'zhihu',
                        'keywords': keywords,
                        'scraped_at': datetime.now().isoformat()
                    })

                    print(f"  ✅ [{idx+1}] {title[:40]}... ({answer_count}回答)")

                except Exception as e:
                    print(f"  ⚠️ 解析问题失败: {e}")
                    continue

            print(f"✅ 成功抓取 {len(results)} 个知乎问题")

        except Exception as e:
            print(f"❌ 知乎抓取失败: {e}")

        return results


class MultiPlatformScraper:
    """多平台真实抓取聚合器"""

    def __init__(self, linkedin_email: str = "", linkedin_password: str = "", headless: bool = True):
        self.linkedin_email = linkedin_email
        self.linkedin_password = linkedin_password
        self.headless = headless

    def scrape_all(self, keywords: str, platforms: List[str] = None, limit: int = 20) -> Dict:
        """
        在所有平台抓取数据

        Args:
            keywords: 搜索关键词
            platforms: 平台列表 ['linkedin', 'xiaohongshu', 'zhihu']
            limit: 每个平台返回数量

        Returns:
            Dict: 各平台结果
        """
        if platforms is None:
            platforms = ['xiaohongshu', 'zhihu']  # 默认不包含LinkedIn(需要登录)

        results = {
            'keywords': keywords,
            'timestamp': datetime.now().isoformat(),
            'platforms': {}
        }

        # 小红书
        if 'xiaohongshu' in platforms:
            print("\n" + "="*50)
            print("📱 开始抓取小红书")
            print("="*50)
            try:
                with XiaohongshuScraper(headless=self.headless) as scraper:
                    results['platforms']['xiaohongshu'] = scraper.search_notes(keywords, limit)
            except Exception as e:
                print(f"❌ 小红书抓取失败: {e}")
                results['platforms']['xiaohongshu'] = []

        # 知乎
        if 'zhihu' in platforms:
            print("\n" + "="*50)
            print("📚 开始抓取知乎")
            print("="*50)
            try:
                with ZhihuScraper(headless=self.headless) as scraper:
                    results['platforms']['zhihu'] = scraper.search_questions(keywords, limit)
            except Exception as e:
                print(f"❌ 知乎抓取失败: {e}")
                results['platforms']['zhihu'] = []

        # LinkedIn
        if 'linkedin' in platforms:
            print("\n" + "="*50)
            print("💼 开始抓取LinkedIn")
            print("="*50)
            try:
                with LinkedInScraper(self.linkedin_email, self.linkedin_password, headless=self.headless) as scraper:
                    results['platforms']['linkedin'] = scraper.search_people(keywords, limit=limit)
            except Exception as e:
                print(f"❌ LinkedIn抓取失败: {e}")
                results['platforms']['linkedin'] = []

        # 统计
        total_count = sum(len(v) if isinstance(v, list) else 0 for v in results['platforms'].values())
        print("\n" + "="*50)
        print(f"✅ 抓取完成! 共获取 {total_count} 条数据")
        print("="*50)

        return results

    def convert_to_leads(self, scrape_results: Dict) -> List[Dict]:
        """
        将抓取结果转换为线索格式

        Args:
            scrape_results: 抓取结果

        Returns:
            List[Dict]: 线索列表
        """
        leads = []

        for platform, data in scrape_results.get('platforms', {}).items():
            if not isinstance(data, list):
                continue

            for item in data:
                lead = {
                    'name': '',
                    'email': '',
                    'phone': '',
                    'target_country': '',
                    'target_degree': '',
                    'major': '',
                    'budget': '',
                    'source': platform,
                    'source_url': item.get('url', ''),
                    'status': 'new',
                    'scraped_at': item.get('scraped_at', ''),
                    'notes': ''
                }

                if platform == 'linkedin':
                    lead['name'] = item.get('name', '')
                    lead['notes'] = f"职位: {item.get('title', '')}\n公司: {item.get('company', '')}\n地区: {item.get('location', '')}"

                elif platform == 'xiaohongshu':
                    lead['name'] = item.get('author', '')
                    lead['notes'] = f"笔记: {item.get('title', '')}\n点赞: {item.get('likes', 0)}"

                elif platform == 'zhihu':
                    lead['name'] = '知乎用户'
                    lead['notes'] = f"问题: {item.get('title', '')}\n回答数: {item.get('answer_count', 0)}\n关注数: {item.get('follower_count', 0)}"

                leads.append(lead)

        return leads


# 测试函数
def test_scraper():
    """测试抓取功能"""
    print("🚀 开始测试真实抓取...")

    scraper = MultiPlatformScraper(headless=False)  # 显示浏览器方便调试

    # 测试抓取
    results = scraper.scrape_all(
        keywords="美国留学",
        platforms=['xiaohongshu', 'zhihu'],  # 先测试这两个,LinkedIn需要登录
        limit=5
    )

    # 转换为线索
    leads = scraper.convert_to_leads(results)

    print(f"\n✅ 共转换 {len(leads)} 条线索")

    # 保存结果
    with open('scrape_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("💾 结果已保存到 scrape_results.json")

    return results, leads


if __name__ == "__main__":
    # 运行测试
    if SELENIUM_AVAILABLE:
        test_scraper()
    else:
        print("❌ 请先安装依赖: pip install selenium undetected-chromedriver")
