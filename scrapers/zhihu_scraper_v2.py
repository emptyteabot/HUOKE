#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
知乎爬虫 v2.0 - nodriver版本
完全绕过WebDriver检测,使用CDP直接通信
支持搜索问题、爬取回答和评论、导出Excel
"""

import nodriver as uc
import asyncio
import pandas as pd
import random
from datetime import datetime
from typing import List, Dict, Optional


class ZhihuScraperV2:
    """知乎爬虫类 - nodriver版本"""

    def __init__(self):
        self.browser = None
        self.page = None
        self.data = []

    async def init_browser(self):
        """初始化浏览器"""
        print("正在启动浏览器...")
        try:
            self.browser = await uc.start(
                headless=False,
                browser_args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--window-size=1920,1080'
                ]
            )
            self.page = await self.browser.get('about:blank')
            print("✓ 浏览器启动成功")
            return True
        except Exception as e:
            print(f"✗ 浏览器启动失败: {e}")
            return False

    async def manual_login(self):
        """手动登录知乎"""
        print("\n=== 手动登录 ===")
        try:
            await self.page.get("https://www.zhihu.com/signin")
            print("请在浏览器中完成登录...")
            print("登录完成后,请在控制台输入 'y' 继续")

            # 等待用户确认登录完成
            while True:
                user_input = input("是否已完成登录? (y/n): ").strip().lower()
                if user_input == 'y':
                    break
                elif user_input == 'n':
                    print("请继续登录...")
                else:
                    print("请输入 y 或 n")

            # 验证是否登录成功
            await asyncio.sleep(2)
            current_url = self.page.url
            if "signin" not in current_url:
                print("✓ 登录成功")
                return True
            else:
                print("✗ 登录失败,请重试")
                return False

        except Exception as e:
            print(f"✗ 登录过程出错: {e}")
            return False

    async def search_question(self, keyword: str) -> Optional[str]:
        """搜索问题"""
        print(f"\n正在搜索: {keyword}")
        try:
            search_url = f"https://www.zhihu.com/search?type=content&q={keyword}"
            await self.page.get(search_url)
            await self.random_delay(2, 4)

            # 等待搜索结果加载
            await self.page.wait_for('.List-item', timeout=10)
            print("✓ 搜索结果加载完成")

            # 获取第一个问题链接
            question_items = await self.page.query_selector_all('h2.ContentItem-title a')
            if not question_items:
                print("✗ 未找到相关问题")
                return None

            question_url = await question_items[0].get_attribute('href')
            print(f"✓ 找到问题: {question_url}")
            return question_url

        except Exception as e:
            print(f"✗ 搜索失败: {e}")
            return None

    async def scrape_question(self, question_url: str, max_answers: int = 10):
        """爬取问题下的回答"""
        print(f"\n正在爬取问题: {question_url}")
        try:
            await self.page.get(question_url)
            await self.random_delay(3, 5)

            # 获取问题标题
            try:
                title_elem = await self.page.query_selector('h1.QuestionHeader-title')
                question_title = await title_elem.text if title_elem else "未知问题"
                print(f"问题标题: {question_title}")
            except:
                question_title = "未知问题"

            # 滚动加载更多回答
            await self.scroll_to_load_more(max_answers)

            # 获取所有回答
            answer_items = await self.page.query_selector_all('div.List-item')
            print(f"找到 {len(answer_items)} 个回答")

            count = 0
            for idx, item in enumerate(answer_items[:max_answers], 1):
                try:
                    print(f"\n处理第 {idx}/{min(max_answers, len(answer_items))} 个回答...")

                    # 提取回答信息
                    answer_data = await self.extract_answer_data(item, question_title, question_url)
                    if answer_data:
                        self.data.append(answer_data)
                        count += 1
                        print(f"✓ 已保存回答: {answer_data['用户名']}")

                    # 爬取评论
                    await self.scrape_comments(item, question_title, question_url)

                    await self.random_delay(1, 2)

                except Exception as e:
                    print(f"✗ 处理回答 {idx} 时出错: {e}")
                    continue

            print(f"\n✓ 共爬取 {count} 个回答")
            return count

        except Exception as e:
            print(f"✗ 爬取问题失败: {e}")
            return 0

    async def extract_answer_data(self, item, question_title: str, question_url: str) -> Optional[Dict]:
        """提取回答数据"""
        try:
            # 用户名
            try:
                username_elem = await item.query_selector('a.UserLink-link')
                username = await username_elem.text if username_elem else "匿名用户"
                user_url = await username_elem.get_attribute('href') if username_elem else ""
                if user_url and not user_url.startswith("http"):
                    user_url = "https://www.zhihu.com" + user_url
            except:
                username = "匿名用户"
                user_url = ""

            # 回答内容
            try:
                content_elem = await item.query_selector('div.RichContent-inner')
                content = await content_elem.text if content_elem else ""
                # 限制长度
                if len(content) > 500:
                    content = content[:500] + "..."
            except:
                content = ""

            # 点赞数
            try:
                vote_elem = await item.query_selector('button.VoteButton--up')
                vote_count = await vote_elem.text if vote_elem else "0"
            except:
                vote_count = "0"

            return {
                "类型": "回答",
                "问题标题": question_title,
                "问题链接": question_url,
                "用户名": username,
                "用户主页": user_url,
                "内容": content,
                "点赞数": vote_count,
                "爬取时间": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

        except Exception as e:
            print(f"提取回答数据失败: {e}")
            return None

    async def scrape_comments(self, answer_item, question_title: str, question_url: str, max_comments: int = 5):
        """爬取回答下的评论"""
        try:
            # 查找评论按钮
            try:
                comment_btn = await answer_item.query_selector('button.ContentItem-action')
                if comment_btn:
                    btn_text = await comment_btn.text
                    if "评论" in btn_text:
                        # 点击展开评论
                        await comment_btn.click()
                        await self.random_delay(1, 2)
                    else:
                        return
                else:
                    return
            except:
                return

            # 等待评论加载
            await asyncio.sleep(2)

            # 获取评论列表
            try:
                comment_items = await answer_item.query_selector_all('div.CommentItem')
                print(f"  找到 {len(comment_items)} 条评论")

                for idx, comment in enumerate(comment_items[:max_comments], 1):
                    try:
                        comment_data = await self.extract_comment_data(comment, question_title, question_url)
                        if comment_data:
                            self.data.append(comment_data)
                            print(f"  ✓ 已保存评论 {idx}: {comment_data['用户名']}")
                    except Exception as e:
                        print(f"  ✗ 提取评论 {idx} 失败: {e}")
                        continue

            except Exception as e:
                print(f"  获取评论列表失败: {e}")

        except Exception as e:
            print(f"  爬取评论失败: {e}")

    async def extract_comment_data(self, comment_item, question_title: str, question_url: str) -> Optional[Dict]:
        """提取评论数据"""
        try:
            # 用户名
            try:
                username_elem = await comment_item.query_selector('a.UserLink-link')
                username = await username_elem.text if username_elem else "匿名用户"
                user_url = await username_elem.get_attribute('href') if username_elem else ""
                if user_url and not user_url.startswith("http"):
                    user_url = "https://www.zhihu.com" + user_url
            except:
                username = "匿名用户"
                user_url = ""

            # 评论内容
            try:
                content_elem = await comment_item.query_selector('div.CommentItem-content')
                content = await content_elem.text if content_elem else ""
            except:
                content = ""

            # 点赞数
            try:
                vote_elem = await comment_item.query_selector('button.Button--plain')
                vote_count = await vote_elem.text if vote_elem else "0"
            except:
                vote_count = "0"

            return {
                "类型": "评论",
                "问题标题": question_title,
                "问题链接": question_url,
                "用户名": username,
                "用户主页": user_url,
                "内容": content,
                "点赞数": vote_count,
                "爬取时间": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

        except Exception as e:
            print(f"提取评论数据失败: {e}")
            return None

    async def scroll_to_load_more(self, target_count: int):
        """滚动页面加载更多内容"""
        print("正在滚动加载更多内容...")
        scroll_count = 0
        max_scrolls = 5

        while scroll_count < max_scrolls:
            # 滚动到底部
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight);")
            await self.random_delay(2, 3)

            scroll_count += 1
            print(f"已滚动 {scroll_count} 次")

    async def random_delay(self, min_sec: float = 1, max_sec: float = 3):
        """随机延迟"""
        delay = random.uniform(min_sec, max_sec)
        await asyncio.sleep(delay)

    def export_to_excel(self, filename: Optional[str] = None) -> bool:
        """导出数据到Excel"""
        if not self.data:
            print("✗ 没有数据可导出")
            return False

        try:
            if filename is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"知乎数据_{timestamp}.xlsx"

            if not filename.endswith('.xlsx'):
                filename += '.xlsx'

            df = pd.DataFrame(self.data)
            columns_order = ["类型", "问题标题", "用户名", "用户主页", "内容", "点赞数", "问题链接", "爬取时间"]
            df = df[columns_order]

            df.to_excel(filename, index=False, engine='openpyxl')
            print(f"\n✓ 数据已导出到: {filename}")
            print(f"  共 {len(self.data)} 条数据")
            print(f"  回答: {len([d for d in self.data if d['类型'] == '回答'])} 条")
            print(f"  评论: {len([d for d in self.data if d['类型'] == '评论'])} 条")
            return True

        except Exception as e:
            print(f"✗ 导出Excel失败: {e}")
            return False

    async def close(self):
        """关闭浏览器"""
        if self.browser:
            print("\n正在关闭浏览器...")
            await self.browser.stop()
            print("✓ 浏览器已关闭")


async def main():
    """主函数"""
    print("=" * 60)
    print("知乎爬虫 v2.0 - nodriver版本")
    print("=" * 60)

    scraper = ZhihuScraperV2()

    try:
        # 1. 初始化浏览器
        if not await scraper.init_browser():
            print("浏览器初始化失败,程序退出")
            return

        # 2. 手动登录
        if not await scraper.manual_login():
            print("登录失败,程序退出")
            return

        # 3. 输入搜索关键词
        print("\n" + "=" * 60)
        keyword = input("请输入搜索关键词: ").strip()
        if not keyword:
            print("关键词不能为空")
            return

        # 4. 搜索问题
        question_url = await scraper.search_question(keyword)
        if not question_url:
            print("未找到相关问题")
            return

        # 5. 设置爬取数量
        try:
            max_answers = int(input("请输入要爬取的回答数量 (默认10): ").strip() or "10")
        except:
            max_answers = 10

        # 6. 爬取数据
        print("\n" + "=" * 60)
        print("开始爬取数据...")
        print("=" * 60)
        await scraper.scrape_question(question_url, max_answers)

        # 7. 导出Excel
        print("\n" + "=" * 60)
        filename = input("请输入导出文件名 (直接回车使用默认名称): ").strip()
        scraper.export_to_excel(filename if filename else None)

        print("\n" + "=" * 60)
        print("爬取完成!")
        print("=" * 60)

    except KeyboardInterrupt:
        print("\n\n用户中断程序")
    except Exception as e:
        print(f"\n程序出错: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await scraper.close()


if __name__ == "__main__":
    # nodriver需要在异步环境中运行
    uc.loop().run_until_complete(main())
