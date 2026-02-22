"""
小红书爬虫 - 生产级实现
基于 base_scraper.py 基类
消灭所有玩具代码,使用显式等待和重试机制
"""

import asyncio
import pandas as pd
from datetime import datetime
from typing import List, Dict, Optional
from base_scraper import BaseSocialScraper, retry_on_failure, logger


class XiaohongshuScraper(BaseSocialScraper):
    """小红书爬虫 - 专业级实现"""

    def __init__(self, headless: bool = False):
        super().__init__(platform='xiaohongshu', headless=headless)
        self.comments_data = []

    async def _get_loaded_count(self) -> int:
        """获取已加载的笔记数量"""
        try:
            elements = await self.page.query_selector_all("a[href*='/explore/']")
            return len(elements) if elements else 0
        except:
            return 0

    @retry_on_failure(max_retries=3)
    async def search_keyword(self, keyword: str) -> bool:
        """
        搜索关键词

        Args:
            keyword: 搜索关键词

        Returns:
            是否成功
        """
        logger.info(f"搜索关键词: {keyword}")

        search_url = self.config['xiaohongshu']['search_url'].format(keyword=keyword)
        await self.page.get(search_url)

        # 等待搜索结果加载 - 使用显式等待
        selectors = [
            ".note-item",
            "[class*='note']",
            "[class*='feed-card']",
            "a[href*='/explore/']"
        ]

        element = await self.wait_for_any_element(selectors, timeout=15)
        if element:
            logger.info("搜索结果加载成功")
            return True
        else:
            logger.warning("搜索结果加载超时,尝试继续")
            return True

    @retry_on_failure(max_retries=2)
    async def get_note_links(self, max_notes: int = 10) -> List[str]:
        """
        获取笔记链接 - 使用智能滚动和显式等待

        Args:
            max_notes: 最大笔记数量

        Returns:
            笔记链接列表
        """
        logger.info(f"获取前 {max_notes} 条笔记链接...")
        note_links = []
        seen_links = set()

        # 智能滚动加载
        await self.smart_scroll(
            target_count=max_notes,
            max_scrolls=5,
            scroll_pause=2.0
        )

        # 获取所有笔记链接
        selectors = self.config['xiaohongshu']['note_selectors']

        for selector in selectors:
            try:
                elements = await self.page.query_selector_all(selector)
                if not elements:
                    continue

                for element in elements:
                    if len(note_links) >= max_notes:
                        break

                    href = await self.safe_get_attribute(element, 'href')
                    if not href:
                        continue

                    # 验证是否为有效笔记链接
                    if '/explore/' in href or '/discovery/item/' in href:
                        # 去重
                        if href not in seen_links:
                            seen_links.add(href)
                            note_links.append(href)
                            logger.debug(f"找到笔记 {len(note_links)}: {href[:60]}...")

                if len(note_links) >= max_notes:
                    break

            except Exception as e:
                logger.warning(f"选择器 {selector} 失败: {e}")
                continue

        logger.info(f"共找到 {len(note_links)} 条笔记链接")
        return note_links

    @retry_on_failure(max_retries=3)
    async def scrape_note_comments(
        self,
        note_url: str,
        max_comments: int = 20
    ) -> List[Dict]:
        """
        爬取笔记评论 - 使用显式等待

        Args:
            note_url: 笔记URL
            max_comments: 最大评论数

        Returns:
            评论数据列表
        """
        logger.info(f"爬取笔记: {note_url[:60]}...")

        await self.page.get(note_url)
        await self.random_delay(2, 3)

        # 等待笔记内容加载
        content_selectors = [
            ".note-content",
            "[class*='note-content']",
            ".content"
        ]
        await self.wait_for_any_element(content_selectors, timeout=10)

        # 获取笔记标题
        title = await self._extract_note_title()

        # 获取作者信息
        author = await self._extract_author_info()

        # 滚动加载评论
        await self._scroll_to_comments()

        # 提取评论
        comments = await self._extract_comments(
            note_url=note_url,
            note_title=title,
            note_author=author,
            max_comments=max_comments
        )

        logger.info(f"提取到 {len(comments)} 条评论")
        return comments

    async def _extract_note_title(self) -> str:
        """提取笔记标题"""
        selectors = [
            ".title",
            "[class*='title']",
            "h1"
        ]

        for selector in selectors:
            try:
                element = await self.page.query_selector(selector)
                if element:
                    title = await self.safe_get_text(element)
                    if title:
                        return title
            except:
                continue

        return "未知标题"

    async def _extract_author_info(self) -> str:
        """提取作者信息"""
        selectors = [
            ".author-name",
            "[class*='author']",
            ".username"
        ]

        for selector in selectors:
            try:
                element = await self.page.query_selector(selector)
                if element:
                    author = await self.safe_get_text(element)
                    if author:
                        return author
            except:
                continue

        return "未知作者"

    async def _scroll_to_comments(self):
        """滚动到评论区"""
        try:
            # 滚动到页面中部(评论区通常在这里)
            await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight / 2)')
            await asyncio.sleep(1)

            # 再滚动到底部加载更多评论
            await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await asyncio.sleep(2)
        except Exception as e:
            logger.warning(f"滚动到评论区失败: {e}")

    async def _extract_comments(
        self,
        note_url: str,
        note_title: str,
        note_author: str,
        max_comments: int
    ) -> List[Dict]:
        """提取评论数据"""
        comments = []

        # 评论选择器(多种尝试)
        comment_selectors = [
            ".comment-item",
            "[class*='comment']",
            ".reply-item"
        ]

        comment_elements = []
        for selector in comment_selectors:
            try:
                elements = await self.page.query_selector_all(selector)
                if elements:
                    comment_elements = elements
                    logger.debug(f"使用选择器: {selector}, 找到 {len(elements)} 条评论")
                    break
            except:
                continue

        if not comment_elements:
            logger.warning("未找到评论元素")
            return comments

        for idx, element in enumerate(comment_elements[:max_comments], 1):
            try:
                comment_data = await self._parse_comment_element(
                    element=element,
                    note_url=note_url,
                    note_title=note_title,
                    note_author=note_author
                )

                if comment_data:
                    comments.append(comment_data)
                    logger.debug(f"提取评论 {idx}: {comment_data.get('用户名', 'Unknown')}")

            except Exception as e:
                logger.warning(f"解析评论 {idx} 失败: {e}")
                continue

        return comments

    async def _parse_comment_element(
        self,
        element: any,
        note_url: str,
        note_title: str,
        note_author: str
    ) -> Optional[Dict]:
        """解析单个评论元素"""
        try:
            # 提取用户名
            username_selectors = [
                ".username",
                "[class*='username']",
                ".user-name"
            ]
            username = None
            for selector in username_selectors:
                try:
                    user_elem = await element.query_selector(selector)
                    if user_elem:
                        username = await self.safe_get_text(user_elem)
                        if username:
                            break
                except:
                    continue

            # 提取评论内容
            content_selectors = [
                ".content",
                "[class*='content']",
                ".comment-text"
            ]
            content = None
            for selector in content_selectors:
                try:
                    content_elem = await element.query_selector(selector)
                    if content_elem:
                        content = await self.safe_get_text(content_elem)
                        if content:
                            break
                except:
                    continue

            # 如果没有用户名或内容,跳过
            if not username or not content:
                return None

            return {
                '平台': '小红书',
                '笔记标题': note_title,
                '笔记作者': note_author,
                '笔记链接': note_url,
                '用户名': username,
                '评论内容': content,
                '抓取时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }

        except Exception as e:
            logger.warning(f"解析评论元素失败: {e}")
            return None

    def export_to_excel(self, filename: str = None):
        """导出数据到Excel"""
        if not self.comments_data:
            logger.warning("没有数据可导出")
            return

        if not filename:
            filename = f"xiaohongshu_comments_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        try:
            df = pd.DataFrame(self.comments_data)
            df.to_excel(filename, index=False, engine='openpyxl')
            logger.info(f"数据已导出: {filename} ({len(self.comments_data)} 条)")
        except Exception as e:
            logger.error(f"导出失败: {e}")


async def main():
    """测试函数"""
    scraper = XiaohongshuScraper(headless=False)

    try:
        # 初始化浏览器
        await scraper.init_browser()

        # 手动登录
        await scraper.manual_login()

        # 搜索关键词
        await scraper.search_keyword("英国留学")

        # 获取笔记链接
        note_links = await scraper.get_note_links(max_notes=5)

        # 爬取评论
        for note_url in note_links:
            comments = await scraper.scrape_note_comments(note_url, max_comments=10)
            scraper.comments_data.extend(comments)

        # 导出数据
        scraper.export_to_excel()

    except Exception as e:
        logger.error(f"执行失败: {e}")
    finally:
        await scraper.cleanup()


if __name__ == '__main__':
    asyncio.run(main())
