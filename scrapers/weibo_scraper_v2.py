#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微博评论爬虫 v2.0 - nodriver版本
完全绕过WebDriver检测,使用CDP直接通信
支持手动登录、话题搜索、评论抓取、Excel导出
"""

import nodriver as uc
import asyncio
import pandas as pd
import random
from datetime import datetime
from typing import List, Dict, Optional
import logging
import sys


class WeiboScraperV2:
    """微博爬虫类 - nodriver版本"""

    def __init__(self):
        self.browser = None
        self.page = None
        self.comments_data = []
        self.setup_logging()

    def setup_logging(self):
        """配置日志"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('weibo_scraper_v2.log', encoding='utf-8'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)

    async def init_browser(self):
        """初始化浏览器"""
        try:
            self.logger.info("正在初始化浏览器...")
            self.browser = await uc.start(
                headless=False,
                browser_args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--lang=zh-CN',
                    '--window-size=1920,1080'
                ]
            )
            self.page = await self.browser.get('about:blank')
            self.logger.info("浏览器初始化成功")
            return True

        except Exception as e:
            self.logger.error(f"浏览器初始化失败: {str(e)}")
            return False

    async def manual_login(self, wait_time: int = 120):
        """手动登录微博"""
        try:
            self.logger.info("正在打开微博登录页面...")
            await self.page.get('https://weibo.com')
            await asyncio.sleep(3)

            print("\n" + "="*60)
            print("请在浏览器中手动完成登录")
            print(f"等待时间: {wait_time}秒")
            print("登录成功后,程序将自动继续...")
            print("="*60 + "\n")

            # 等待登录完成 - 检测是否出现首页特征元素
            start_time = asyncio.get_event_loop().time()
            while asyncio.get_event_loop().time() - start_time < wait_time:
                try:
                    # 检查是否登录成功(检测首页的发布框)
                    elem = await self.page.query_selector('textarea[class*="Form_input"]')
                    if elem:
                        self.logger.info("检测到登录成功!")
                        await asyncio.sleep(2)
                        return True
                except:
                    await asyncio.sleep(2)
                    continue

            self.logger.warning("登录超时,但继续尝试...")
            return True

        except Exception as e:
            self.logger.error(f"登录过程出错: {str(e)}")
            return False

    async def search_topic(self, keyword: str):
        """搜索话题"""
        try:
            self.logger.info(f"正在搜索话题: {keyword}")

            # 使用微博搜索URL
            search_url = f'https://s.weibo.com/weibo?q={keyword}'
            await self.page.get(search_url)
            await self.random_delay(3, 5)

            # 等待搜索结果加载
            try:
                await self.page.wait_for('div[class*="card-wrap"]', timeout=10)
                self.logger.info("搜索结果加载成功")
                return True
            except:
                self.logger.warning("搜索结果加载超时,但继续尝试...")
                return True

        except Exception as e:
            self.logger.error(f"搜索话题失败: {str(e)}")
            return False

    async def get_weibo_links(self, max_posts: int = 10) -> List[str]:
        """获取微博链接"""
        weibo_links = []
        try:
            self.logger.info(f"正在获取微博链接(目标: {max_posts}条)...")

            scroll_count = 0
            max_scrolls = 5

            while len(weibo_links) < max_posts and scroll_count < max_scrolls:
                # 查找所有微博卡片
                try:
                    cards = await self.page.query_selector_all('div[class*="card-wrap"]')

                    for card in cards:
                        if len(weibo_links) >= max_posts:
                            break

                        try:
                            # 尝试多种方式获取微博链接
                            link_element = None

                            # 方法1: 查找时间链接
                            try:
                                link_element = await card.query_selector('a[href*="/detail/"]')
                            except:
                                pass

                            # 方法2: 查找来源链接
                            if not link_element:
                                try:
                                    link_element = await card.query_selector('a[class*="from"]')
                                except:
                                    pass

                            if link_element:
                                href = await link_element.get_attribute('href')
                                if href and '/detail/' in href and href not in weibo_links:
                                    weibo_links.append(href)
                                    self.logger.info(f"找到微博链接 {len(weibo_links)}: {href}")

                        except Exception as e:
                            continue

                    # 滚动页面加载更多
                    if len(weibo_links) < max_posts:
                        await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight);")
                        await self.random_delay(2, 4)
                        scroll_count += 1

                except Exception as e:
                    self.logger.error(f"获取微博链接时出错: {str(e)}")
                    break

            self.logger.info(f"共获取到 {len(weibo_links)} 条微博链接")
            return weibo_links

        except Exception as e:
            self.logger.error(f"获取微博链接失败: {str(e)}")
            return weibo_links

    async def scrape_comments(self, weibo_url: str, max_comments: int = 50) -> List[Dict]:
        """爬取单条微博的评论"""
        comments = []
        try:
            self.logger.info(f"正在爬取微博评论: {weibo_url}")
            await self.page.get(weibo_url)
            await self.random_delay(3, 5)

            # 等待评论区加载
            try:
                await self.page.wait_for('div[class*="CommentItem"]', timeout=10)
            except:
                self.logger.warning("评论区加载超时")
                return comments

            # 滚动加载更多评论
            scroll_count = 0
            max_scrolls = 5
            last_comment_count = 0

            while len(comments) < max_comments and scroll_count < max_scrolls:
                try:
                    # 查找所有评论元素
                    comment_elements = await self.page.query_selector_all('div[class*="CommentItem"]')

                    for element in comment_elements:
                        if len(comments) >= max_comments:
                            break

                        try:
                            comment_data = await self.extract_comment_info(element)
                            if comment_data and comment_data not in comments:
                                comments.append(comment_data)
                                self.logger.info(f"提取评论 {len(comments)}: {comment_data['username']}")

                        except Exception as e:
                            continue

                    # 如果评论数量没有增加,停止滚动
                    if len(comments) == last_comment_count:
                        scroll_count += 1
                    else:
                        scroll_count = 0

                    last_comment_count = len(comments)

                    # 滚动加载更多
                    if len(comments) < max_comments:
                        await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight);")
                        await self.random_delay(2, 3)

                except Exception as e:
                    self.logger.error(f"滚动加载评论时出错: {str(e)}")
                    break

            self.logger.info(f"从该微博提取到 {len(comments)} 条评论")
            return comments

        except Exception as e:
            self.logger.error(f"爬取评论失败: {str(e)}")
            return comments

    async def extract_comment_info(self, element) -> Optional[Dict]:
        """提取评论信息"""
        try:
            comment_data = {
                'username': '',
                'comment_text': '',
                'user_homepage': '',
                'comment_time': '',
                'weibo_url': self.page.url
            }

            # 提取用户名和主页链接
            try:
                user_link = await element.query_selector('a[class*="head_name"]')
                if user_link:
                    comment_data['username'] = (await user_link.text).strip()
                    comment_data['user_homepage'] = await user_link.get_attribute('href')

                    # 确保主页链接完整
                    if comment_data['user_homepage'] and not comment_data['user_homepage'].startswith('http'):
                        comment_data['user_homepage'] = 'https://weibo.com' + comment_data['user_homepage']
            except:
                # 备用方案
                try:
                    user_link = await element.query_selector('a[href*="/u/"]')
                    if user_link:
                        comment_data['username'] = (await user_link.text).strip()
                        comment_data['user_homepage'] = await user_link.get_attribute('href')
                except:
                    pass

            # 提取评论内容
            try:
                comment_text_element = await element.query_selector('div[class*="text"]')
                if comment_text_element:
                    comment_data['comment_text'] = (await comment_text_element.text).strip()
            except:
                pass

            # 提取评论时间
            try:
                time_element = await element.query_selector('div[class*="time"]')
                if time_element:
                    comment_data['comment_time'] = (await time_element.text).strip()
            except:
                pass

            # 验证数据完整性
            if comment_data['username'] and comment_data['comment_text']:
                return comment_data
            else:
                return None

        except Exception as e:
            return None

    async def random_delay(self, min_seconds: float = 1, max_seconds: float = 3):
        """随机延迟"""
        delay = random.uniform(min_seconds, max_seconds)
        await asyncio.sleep(delay)

    def save_to_excel(self, filename: Optional[str] = None) -> bool:
        """保存数据到Excel"""
        try:
            if not self.comments_data:
                self.logger.warning("没有数据可保存")
                return False

            if filename is None:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f'weibo_comments_{timestamp}.xlsx'

            if not filename.endswith('.xlsx'):
                filename += '.xlsx'

            df = pd.DataFrame(self.comments_data)

            # 重新排列列顺序
            columns_order = ['username', 'comment_text', 'user_homepage', 'comment_time', 'weibo_url']
            df = df[columns_order]

            # 重命名列
            df.columns = ['用户名', '评论内容', '用户主页链接', '评论时间', '微博链接']

            df.to_excel(filename, index=False, engine='openpyxl')
            self.logger.info(f"数据已保存到: {filename}")
            self.logger.info(f"共保存 {len(self.comments_data)} 条评论")

            return True

        except Exception as e:
            self.logger.error(f"保存Excel失败: {str(e)}")
            return False

    async def run(self, keyword: str, max_posts: int = 5, max_comments_per_post: int = 30, output_file: Optional[str] = None):
        """运行爬虫主流程"""
        try:
            print("\n" + "="*60)
            print("微博评论爬虫 v2.0 - nodriver版本")
            print("="*60 + "\n")

            # 初始化浏览器
            if not await self.init_browser():
                return False

            # 手动登录
            if not await self.manual_login():
                return False

            # 搜索话题
            if not await self.search_topic(keyword):
                return False

            # 获取微博链接
            weibo_links = await self.get_weibo_links(max_posts)
            if not weibo_links:
                self.logger.error("未找到微博链接")
                return False

            # 爬取每条微博的评论
            for idx, weibo_url in enumerate(weibo_links, 1):
                self.logger.info(f"\n处理第 {idx}/{len(weibo_links)} 条微博")
                comments = await self.scrape_comments(weibo_url, max_comments_per_post)
                self.comments_data.extend(comments)
                await self.random_delay(2, 4)

            # 保存数据
            if self.comments_data:
                self.save_to_excel(output_file)
                print("\n" + "="*60)
                print(f"爬取完成! 共获取 {len(self.comments_data)} 条评论")
                print("="*60 + "\n")
                return True
            else:
                self.logger.warning("未获取到任何评论数据")
                return False

        except Exception as e:
            self.logger.error(f"运行过程出错: {str(e)}")
            return False

        finally:
            await self.close()

    async def close(self):
        """关闭浏览器"""
        if self.browser:
            try:
                await self.browser.stop()
                self.logger.info("浏览器已关闭")
            except:
                pass


async def main():
    """主函数"""
    print("""
╔══════════════════════════════════════════════════════════╗
║           微博评论爬虫 v2.0 - nodriver版本               ║
║           Weibo Comment Scraper                          ║
╚══════════════════════════════════════════════════════════╝
    """)

    # 配置参数
    KEYWORD = input("请输入搜索关键词(例如: #人工智能#): ").strip()
    if not KEYWORD:
        print("❌ 关键词不能为空")
        return

    try:
        MAX_POSTS = int(input("要爬取多少条微博? (默认5条): ").strip() or "5")
        MAX_COMMENTS = int(input("每条微博爬取多少条评论? (默认30条): ").strip() or "30")
    except ValueError:
        print("❌ 请输入有效的数字")
        return

    OUTPUT_FILE = input("输出文件名(默认自动生成): ").strip() or None

    # 创建爬虫实例
    scraper = WeiboScraperV2()

    # 运行爬虫
    success = await scraper.run(
        keyword=KEYWORD,
        max_posts=MAX_POSTS,
        max_comments_per_post=MAX_COMMENTS,
        output_file=OUTPUT_FILE
    )

    if success:
        print("\n✅ 爬取任务完成!")
    else:
        print("\n❌ 爬取任务失败,请查看日志文件")


if __name__ == '__main__':
    try:
        uc.loop().run_until_complete(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断程序")
    except Exception as e:
        print(f"\n❌ 程序异常: {str(e)}")
        import traceback
        traceback.print_exc()
