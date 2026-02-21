"""
小红书/知乎数据抓取 - 针对留学机构获客
"""

import requests
from bs4 import BeautifulSoup
import json
import time
from typing import List, Dict
import re

class SocialMediaScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }

    def scrape_xiaohongshu_comments(self, post_url: str, cookies: str = None) -> List[Dict]:
        """
        抓取小红书帖子评论
        需要提供cookies才能访问
        """
        print(f"🔍 抓取小红书: {post_url}")

        if cookies:
            self.headers['Cookie'] = cookies

        leads = []

        try:
            response = requests.get(post_url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')

            # 小红书的评论结构(需要根据实际页面调整)
            comments = soup.find_all('div', class_='comment-item')

            for comment in comments:
                try:
                    username = comment.find('span', class_='username').text.strip()
                    content = comment.find('div', class_='content').text.strip()

                    # 判断是否有留学意向
                    if self.has_study_abroad_intent(content):
                        lead = {
                            'username': username,
                            'content': content,
                            'platform': '小红书',
                            'source_url': post_url,
                            'intent_score': self.calculate_intent_score(content)
                        }
                        leads.append(lead)
                        print(f"✅ 发现意向用户: {username}")

                except Exception as e:
                    continue

        except Exception as e:
            print(f"❌ 抓取失败: {e}")

        return leads

    def scrape_zhihu_answers(self, question_url: str) -> List[Dict]:
        """
        抓取知乎问题下的回答者
        """
        print(f"🔍 抓取知乎: {question_url}")

        leads = []

        try:
            response = requests.get(question_url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')

            # 知乎回答列表
            answers = soup.find_all('div', class_='List-item')

            for answer in answers[:20]:  # 只取前20个
                try:
                    # 提取用户信息
                    author = answer.find('a', class_='UserLink-link')
                    if not author:
                        continue

                    username = author.text.strip()
                    user_url = 'https://www.zhihu.com' + author.get('href', '')

                    # 提取回答内容
                    content_elem = answer.find('div', class_='RichContent-inner')
                    content = content_elem.text.strip() if content_elem else ""

                    # 判断是否有留学意向
                    if self.has_study_abroad_intent(content):
                        lead = {
                            'username': username,
                            'profile_url': user_url,
                            'content_preview': content[:200],
                            'platform': '知乎',
                            'source_url': question_url,
                            'intent_score': self.calculate_intent_score(content)
                        }
                        leads.append(lead)
                        print(f"✅ 发现意向用户: {username}")

                except Exception as e:
                    continue

            time.sleep(2)  # 避免请求过快

        except Exception as e:
            print(f"❌ 抓取失败: {e}")

        return leads

    def scrape_douyin_comments(self, video_id: str) -> List[Dict]:
        """
        抓取抖音视频评论
        需要使用Selenium或Playwright
        """
        print(f"🔍 抓取抖音视频: {video_id}")

        # 这里需要使用Selenium/Playwright
        # 因为抖音是动态加载的
        leads = []

        # TODO: 实现抖音抓取逻辑

        return leads

    def has_study_abroad_intent(self, text: str) -> bool:
        """判断是否有留学意向"""
        keywords = [
            '留学', '出国', '申请', '托福', '雅思', 'GRE', 'GMAT',
            '美国大学', '英国大学', '加拿大', '澳洲', '新加坡',
            '本科申请', '研究生申请', '博士申请',
            '中介', '顾问', '文书', 'offer', 'admission'
        ]

        return any(keyword in text for keyword in keywords)

    def calculate_intent_score(self, text: str) -> int:
        """计算意向评分"""
        score = 0

        # 高意向关键词
        high_intent = ['想申请', '准备申请', '打算出国', '求推荐中介', '需要帮助']
        for keyword in high_intent:
            if keyword in text:
                score += 20

        # 中意向关键词
        medium_intent = ['了解', '咨询', '考虑', '有没有']
        for keyword in medium_intent:
            if keyword in text:
                score += 10

        # 提到具体学校/专业
        if any(word in text for word in ['哈佛', '斯坦福', 'MIT', '牛津', '剑桥']):
            score += 15

        # 提到预算
        if any(word in text for word in ['预算', '费用', '多少钱']):
            score += 10

        return min(score, 100)

    def extract_contact_info(self, text: str) -> Dict:
        """提取联系方式"""
        contact = {}

        # 提取微信号
        wechat_pattern = r'微信[：:]\s*([a-zA-Z0-9_-]+)'
        wechat_match = re.search(wechat_pattern, text)
        if wechat_match:
            contact['wechat'] = wechat_match.group(1)

        # 提取QQ号
        qq_pattern = r'QQ[：:]\s*(\d{5,11})'
        qq_match = re.search(qq_pattern, text)
        if qq_match:
            contact['qq'] = qq_match.group(1)

        # 提取邮箱
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        email_match = re.search(email_pattern, text)
        if email_match:
            contact['email'] = email_match.group(0)

        # 提取手机号
        phone_pattern = r'1[3-9]\d{9}'
        phone_match = re.search(phone_pattern, text)
        if phone_match:
            contact['phone'] = phone_match.group(0)

        return contact

    def batch_scrape(self, urls: List[str], platform: str = 'xiaohongshu') -> List[Dict]:
        """批量抓取"""
        all_leads = []

        for url in urls:
            print(f"\n📍 处理: {url}")

            if platform == 'xiaohongshu':
                leads = self.scrape_xiaohongshu_comments(url)
            elif platform == 'zhihu':
                leads = self.scrape_zhihu_answers(url)
            else:
                continue

            all_leads.extend(leads)
            time.sleep(3)  # 避免请求过快

        return all_leads


# 使用示例
def main():
    scraper = SocialMediaScraper()

    # 小红书留学相关帖子URL列表
    xiaohongshu_urls = [
        'https://www.xiaohongshu.com/explore/xxx',  # 替换为实际URL
        # 更多URL...
    ]

    # 知乎留学相关问题URL列表
    zhihu_urls = [
        'https://www.zhihu.com/question/xxx',  # 替换为实际URL
        'https://www.zhihu.com/question/yyy',
    ]

    # 抓取小红书
    print("=" * 50)
    print("开始抓取小红书...")
    print("=" * 50)
    xhs_leads = scraper.batch_scrape(xiaohongshu_urls, platform='xiaohongshu')

    # 抓取知乎
    print("\n" + "=" * 50)
    print("开始抓取知乎...")
    print("=" * 50)
    zhihu_leads = scraper.batch_scrape(zhihu_urls, platform='zhihu')

    # 合并结果
    all_leads = xhs_leads + zhihu_leads

    # 按评分排序
    all_leads.sort(key=lambda x: x['intent_score'], reverse=True)

    # 保存结果
    with open('social_media_leads.json', 'w', encoding='utf-8') as f:
        json.dump(all_leads, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 共抓取 {len(all_leads)} 个潜在客户")
    print(f"📊 高意向(>60分): {len([l for l in all_leads if l['intent_score'] > 60])}")
    print(f"📊 中意向(30-60分): {len([l for l in all_leads if 30 < l['intent_score'] <= 60])}")


if __name__ == '__main__':
    main()
