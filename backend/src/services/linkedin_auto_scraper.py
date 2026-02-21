"""
LinkedIn自动抓取服务 - 基于linkedin_scraper (3.7k⭐)
使用Playwright实现异步抓取
"""

from playwright.async_api import async_playwright, Browser, Page
import json
import asyncio
from typing import List, Dict, Optional
from datetime import datetime

class LinkedInAutoScraper:
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.session_file = "linkedin_session.json"

    async def init_browser(self, headless: bool = True):
        """初始化浏览器"""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=headless,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        )

        # 创建上下文
        context = await self.browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )

        self.page = await context.new_page()

        # 尝试加载已保存的会话
        await self.load_session()

    async def load_session(self):
        """加载已保存的会话"""
        try:
            with open(self.session_file, 'r') as f:
                cookies = json.load(f)
                await self.page.context.add_cookies(cookies)
                print("✅ 已加载保存的会话")
        except FileNotFoundError:
            print("⚠️ 未找到保存的会话,需要登录")

    async def save_session(self):
        """保存会话"""
        cookies = await self.page.context.cookies()
        with open(self.session_file, 'w') as f:
            json.dump(cookies, f)
        print("✅ 会话已保存")

    async def login(self, email: str, password: str):
        """自动登录LinkedIn"""
        print("🔐 开始登录LinkedIn...")

        await self.page.goto('https://www.linkedin.com/login')
        await self.page.wait_for_load_state('networkidle')

        # 输入凭证
        await self.page.fill('#username', email)
        await self.page.fill('#password', password)

        # 点击登录
        await self.page.click('button[type="submit"]')

        # 等待登录完成
        try:
            await self.page.wait_for_url('**/feed/**', timeout=30000)
            print("✅ 登录成功!")
            await self.save_session()
            return True
        except:
            print("❌ 登录失败,可能需要验证")
            return False

    async def search_education_leads(
        self,
        keywords: str = "留学 OR study abroad OR 出国",
        location: str = "中国",
        limit: int = 50
    ) -> List[Dict]:
        """搜索留学相关潜在客户"""
        print(f"🔍 搜索关键词: {keywords}, 地区: {location}")

        # 构建搜索URL
        search_url = f"https://www.linkedin.com/search/results/people/?keywords={keywords}&geoUrn={location}"
        await self.page.goto(search_url)
        await self.page.wait_for_load_state('networkidle')

        leads = []

        # 滚动加载更多结果
        for i in range(limit // 10):
            await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await asyncio.sleep(2)
            print(f"📜 已滚动 {i+1} 次...")

        # 提取数据
        results = await self.page.query_selector_all('.reusable-search__result-container')

        for result in results[:limit]:
            try:
                # 提取姓名
                name_elem = await result.query_selector('.entity-result__title-text a')
                name = await name_elem.inner_text() if name_elem else ""

                # 提取标题/职位
                title_elem = await result.query_selector('.entity-result__primary-subtitle')
                title = await title_elem.inner_text() if title_elem else ""

                # 提取公司/学校
                company_elem = await result.query_selector('.entity-result__secondary-subtitle')
                company = await company_elem.inner_text() if company_elem else ""

                # 提取地区
                location_elem = await result.query_selector('.entity-result__location')
                location = await location_elem.inner_text() if location_elem else ""

                # 提取LinkedIn URL
                profile_url = await name_elem.get_attribute('href') if name_elem else ""

                # 评分逻辑
                score = self.calculate_lead_score(title, company, location)

                lead = {
                    'name': name.strip(),
                    'title': title.strip(),
                    'company': company.strip(),
                    'location': location.strip(),
                    'linkedin_url': profile_url,
                    'score': score,
                    'source': 'linkedin',
                    'scraped_at': datetime.now().isoformat()
                }

                leads.append(lead)
                print(f"✅ 提取: {name} - {title} (评分: {score})")

            except Exception as e:
                print(f"⚠️ 提取失败: {e}")
                continue

        print(f"🎉 共提取 {len(leads)} 个潜在客户")
        return leads

    def calculate_lead_score(self, title: str, company: str, location: str) -> int:
        """计算线索评分"""
        score = 0

        # 标题评分
        high_value_keywords = ['学生', '家长', '教育', '留学顾问', '升学']
        for keyword in high_value_keywords:
            if keyword in title:
                score += 15

        # 公司评分
        if any(word in company for word in ['大学', '学院', '高中', '中学']):
            score += 10

        # 地区评分
        tier1_cities = ['北京', '上海', '深圳', '广州', '杭州']
        if any(city in location for city in tier1_cities):
            score += 5

        return score

    async def get_profile_details(self, profile_url: str) -> Dict:
        """获取个人资料详情"""
        print(f"📄 获取资料: {profile_url}")

        await self.page.goto(profile_url)
        await self.page.wait_for_load_state('networkidle')

        # 提取详细信息
        details = {}

        try:
            # 关于
            about_elem = await self.page.query_selector('#about + div .inline-show-more-text')
            details['about'] = await about_elem.inner_text() if about_elem else ""

            # 经历
            experiences = []
            exp_items = await self.page.query_selector_all('#experience + div li')
            for item in exp_items[:3]:  # 只取前3个
                exp_text = await item.inner_text()
                experiences.append(exp_text)
            details['experiences'] = experiences

            # 教育背景
            educations = []
            edu_items = await self.page.query_selector_all('#education + div li')
            for item in edu_items[:3]:
                edu_text = await item.inner_text()
                educations.append(edu_text)
            details['educations'] = educations

        except Exception as e:
            print(f"⚠️ 提取详情失败: {e}")

        return details

    async def close(self):
        """关闭浏览器"""
        if self.browser:
            await self.browser.close()
            print("🔒 浏览器已关闭")


# 使用示例
async def main():
    scraper = LinkedInAutoScraper()

    try:
        # 初始化
        await scraper.init_browser(headless=False)

        # 登录
        await scraper.login(
            email="your@email.com",
            password="your_password"
        )

        # 搜索留学相关潜在客户
        leads = await scraper.search_education_leads(
            keywords="留学 OR study abroad OR 托福 OR 雅思",
            location="中国",
            limit=50
        )

        # 保存到JSON
        with open('leads.json', 'w', encoding='utf-8') as f:
            json.dump(leads, f, ensure_ascii=False, indent=2)

        print(f"✅ 已保存 {len(leads)} 个潜在客户到 leads.json")

    finally:
        await scraper.close()


if __name__ == '__main__':
    asyncio.run(main())
