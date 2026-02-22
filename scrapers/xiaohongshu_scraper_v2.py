#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小红书评论爬虫 v2.0 - nodriver版本
完全绕过WebDriver检测,使用CDP直接通信
支持手动登录、关键词搜索、评论抓取、数据导出
"""

import nodriver as uc
import asyncio
import pandas as pd
import random
from datetime import datetime
from typing import List, Dict, Optional


class XiaohongshuScraperV2:
    """小红书爬虫类 - nodriver版本"""

    def __init__(self):
        self.browser = None
        self.page = None
        self.comments_data = []

    async def init_browser(self):
        """初始化浏览器驱动"""
        print("正在启动浏览器...")
        try:
            self.browser = await uc.start(
                headless=False,
                browser_args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--window-size=1920,1080'
                ]
            )
            self.page = await self.browser.get('about:blank')
            print("✓ 浏览器启动成功")
            return True

        except Exception as e:
            print(f"✗ 浏览器启动失败: {e}")
            return False

    async def login(self):
        """手动登录小红书"""
        print("\n=== 登录小红书 ===")
        try:
            await self.page.get("https://www.xiaohongshu.com")
            await self.random_sleep(2, 4)

            print("\n请在浏览器中完成登录:")
            print("1. 点击右上角登录按钮")
            print("2. 选择扫码或手机号登录")
            print("3. 完成登录后,在控制台输入 'y' 继续")

            # 等待用户确认登录完成
            while True:
                user_input = input("\n登录完成了吗? (y/n): ").strip().lower()
                if user_input == 'y':
                    break
                elif user_input == 'n':
                    print("请继续登录...")
                    await asyncio.sleep(2)

            # 验证登录状态
            try:
                # 检查是否有用户头像或用户名元素
                elem = await self.page.query_selector(".avatar, .user-info, [class*='avatar']")
                if elem:
                    print("✓ 登录验证成功")
                    return True
                else:
                    print("⚠ 未检测到登录状态,但继续执行...")
                    return True
            except:
                print("⚠ 未检测到登录状态,但继续执行...")
                return True

        except Exception as e:
            print(f"✗ 登录过程出错: {e}")
            return False

    async def search_keyword(self, keyword: str):
        """搜索关键词"""
        print(f"\n=== 搜索关键词: {keyword} ===")
        try:
            # 访问搜索页面
            search_url = f"https://www.xiaohongshu.com/search_result?keyword={keyword}&source=web_search_result_notes"
            await self.page.get(search_url)
            await self.random_sleep(3, 5)

            # 等待搜索结果加载
            try:
                await self.page.wait_for(".note-item, [class*='note'], [class*='feed-card']", timeout=10)
                print("✓ 搜索结果加载成功")
                return True
            except:
                print("⚠ 搜索结果加载超时,尝试继续...")
                return True

        except Exception as e:
            print(f"✗ 搜索失败: {e}")
            return False

    async def get_note_links(self, max_notes: int = 10) -> List[str]:
        """获取笔记链接"""
        print(f"\n正在获取前 {max_notes} 条笔记链接...")
        note_links = []

        try:
            # 滚动页面加载更多笔记
            scroll_count = 0
            max_scrolls = 5

            while len(note_links) < max_notes and scroll_count < max_scrolls:
                # 查找笔记链接
                try:
                    # 多种选择器尝试
                    selectors = [
                        "a[href*='/explore/']",
                        "a[href*='/discovery/item/']",
                        ".note-item a",
                        "[class*='note'] a",
                        "[class*='feed-card'] a"
                    ]

                    elements = []
                    for selector in selectors:
                        try:
                            elements = await self.page.query_selector_all(selector)
                            if elements:
                                break
                        except:
                            continue

                    for element in elements:
                        try:
                            href = await element.get_attribute('href')
                            if href and ('/explore/' in href or '/discovery/item/' in href):
                                if href not in note_links:
                                    note_links.append(href)
                                    print(f"  找到笔记 {len(note_links)}: {href[:60]}...")

                                if len(note_links) >= max_notes:
                                    break
                        except Exception as e:
                            continue

                    # 滚动页面
                    if len(note_links) < max_notes:
                        await self.page.evaluate("window.scrollBy(0, 800);")
                        await self.random_sleep(1, 2)
                        scroll_count += 1
                    else:
                        break

                except Exception as e:
                    print(f"  获取链接时出错: {e}")
                    break

            print(f"✓ 共获取到 {len(note_links)} 条笔记链接")
            return note_links[:max_notes]

        except Exception as e:
            print(f"✗ 获取笔记链接失败: {e}")
            return note_links

    async def extract_comments(self, note_url: str, max_comments: int = 50):
        """提取单个笔记的评论"""
        print(f"\n正在爬取笔记: {note_url[:60]}...")

        try:
            await self.page.get(note_url)
            await self.random_sleep(3, 5)

            # 等待页面加载
            try:
                await self.page.wait_for("body", timeout=10)
            except:
                print("  ⚠ 页面加载超时")
                return

            # 滚动加载评论
            scroll_count = 0
            max_scrolls = 10
            last_comment_count = 0

            while scroll_count < max_scrolls:
                # 滚动到评论区
                try:
                    await self.page.evaluate("window.scrollBy(0, 500);")
                    await self.random_sleep(1, 2)
                except:
                    pass

                # 尝试点击"展开更多评论"按钮
                try:
                    more_buttons = await self.page.query_selector_all("[class*='more'], [class*='load']")
                    for btn in more_buttons:
                        try:
                            await btn.click()
                            await self.random_sleep(1, 2)
                        except:
                            pass
                except:
                    pass

                # 提取评论
                current_count = await self._extract_current_comments(note_url)

                if current_count == last_comment_count:
                    scroll_count += 1
                else:
                    scroll_count = 0
                    last_comment_count = current_count

                if current_count >= max_comments:
                    break

            print(f"  ✓ 从该笔记提取了 {len([c for c in self.comments_data if c['note_url'] == note_url])} 条评论")

        except Exception as e:
            print(f"  ✗ 提取评论失败: {e}")

    async def _extract_current_comments(self, note_url: str) -> int:
        """提取当前页面的评论"""
        try:
            # 多种评论选择器
            comment_selectors = [
                "[class*='comment-item']",
                "[class*='comment']",
                ".comment",
                "[id*='comment']"
            ]

            comment_elements = []
            for selector in comment_selectors:
                try:
                    elements = await self.page.query_selector_all(selector)
                    if elements:
                        comment_elements = elements
                        break
                except:
                    continue

            if not comment_elements:
                return 0

            for element in comment_elements:
                try:
                    # 提取用户名
                    username = ""
                    username_selectors = [
                        "[class*='username']",
                        "[class*='user-name']",
                        "[class*='nickname']",
                        ".name"
                    ]
                    for sel in username_selectors:
                        try:
                            username_elem = await element.query_selector(sel)
                            if username_elem:
                                username = (await username_elem.text).strip()
                                if username:
                                    break
                        except:
                            continue

                    # 提取评论内容
                    content = ""
                    content_selectors = [
                        "[class*='content']",
                        "[class*='text']",
                        "p",
                        "span"
                    ]
                    for sel in content_selectors:
                        try:
                            content_elem = await element.query_selector(sel)
                            if content_elem:
                                content = (await content_elem.text).strip()
                                if content and len(content) > 5:
                                    break
                        except:
                            continue

                    # 提取用户主页链接
                    user_link = ""
                    try:
                        link_elem = await element.query_selector("a[href*='/user/']")
                        if link_elem:
                            user_link = await link_elem.get_attribute('href')
                    except:
                        pass

                    # 数据验证和去重
                    if username and content:
                        comment_id = f"{note_url}_{username}_{content[:20]}"

                        # 检查是否已存在
                        exists = any(
                            c['note_url'] == note_url and
                            c['username'] == username and
                            c['content'][:20] == content[:20]
                            for c in self.comments_data
                        )

                        if not exists:
                            self.comments_data.append({
                                'note_url': note_url,
                                'username': username,
                                'content': content,
                                'user_link': user_link,
                                'crawl_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                            })

                except Exception as e:
                    continue

            return len([c for c in self.comments_data if c['note_url'] == note_url])

        except Exception as e:
            return 0

    def export_to_excel(self, filename: Optional[str] = None):
        """导出数据到Excel"""
        if not self.comments_data:
            print("\n⚠ 没有数据可导出")
            return None

        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"xiaohongshu_comments_{timestamp}.xlsx"

        try:
            df = pd.DataFrame(self.comments_data)

            # 重新排列列顺序
            columns = ['username', 'content', 'user_link', 'note_url', 'crawl_time']
            df = df[columns]

            # 导出Excel
            df.to_excel(filename, index=False, engine='openpyxl')

            print(f"\n✓ 数据已导出到: {filename}")
            print(f"  共 {len(self.comments_data)} 条评论")

            return filename

        except Exception as e:
            print(f"\n✗ 导出失败: {e}")
            return None

    async def random_sleep(self, min_sec: float = 1, max_sec: float = 3):
        """随机延迟"""
        await asyncio.sleep(random.uniform(min_sec, max_sec))

    async def close(self):
        """关闭浏览器"""
        if self.browser:
            try:
                await self.browser.stop()
                print("\n✓ 浏览器已关闭")
            except:
                pass


async def main():
    """主函数"""
    print("=" * 60)
    print("小红书评论爬虫 v2.0 - nodriver版本")
    print("=" * 60)

    scraper = XiaohongshuScraperV2()

    try:
        # 1. 初始化浏览器
        if not await scraper.init_browser():
            print("\n程序退出")
            return

        # 2. 登录
        if not await scraper.login():
            print("\n登录失败,程序退出")
            return

        # 3. 获取搜索关键词
        keyword = input("\n请输入搜索关键词: ").strip()
        if not keyword:
            print("关键词不能为空")
            return

        # 4. 获取爬取数量
        try:
            max_notes = int(input("要爬取多少条笔记? (默认10): ").strip() or "10")
            max_comments = int(input("每条笔记最多爬取多少评论? (默认50): ").strip() or "50")
        except ValueError:
            max_notes = 10
            max_comments = 50

        # 5. 搜索关键词
        if not await scraper.search_keyword(keyword):
            print("\n搜索失败,程序退出")
            return

        # 6. 获取笔记链接
        note_links = await scraper.get_note_links(max_notes)
        if not note_links:
            print("\n未找到笔记,程序退出")
            return

        # 7. 爬取评论
        print(f"\n=== 开始爬取 {len(note_links)} 条笔记的评论 ===")
        for i, note_url in enumerate(note_links, 1):
            print(f"\n[{i}/{len(note_links)}] 处理笔记...")
            await scraper.extract_comments(note_url, max_comments)
            await scraper.random_sleep(2, 4)

        # 8. 导出数据
        print("\n=== 导出数据 ===")
        output_file = scraper.export_to_excel()

        if output_file:
            print(f"\n{'='*60}")
            print("爬取完成!")
            print(f"数据文件: {output_file}")
            print(f"总评论数: {len(scraper.comments_data)}")
            print(f"{'='*60}")

    except KeyboardInterrupt:
        print("\n\n用户中断程序")
    except Exception as e:
        print(f"\n程序出错: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await scraper.close()


if __name__ == "__main__":
    uc.loop().run_until_complete(main())
