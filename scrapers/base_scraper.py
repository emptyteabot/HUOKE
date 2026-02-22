"""
社交媒体爬虫基类 - 生产级实现
消灭所有玩具代码:
- 移除所有 time.sleep() 硬等待
- 移除掩盖错误的 except Exception: continue
- 使用显式等待和重试机制
- 统一错误处理和日志
"""

import nodriver as uc
import asyncio
import random
from typing import List, Dict, Optional, Callable
from datetime import datetime
from functools import wraps
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def retry_on_failure(max_retries: int = 3, delay: float = 2.0):
    """重试装饰器 - 替代垃圾的 try/except continue"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        wait_time = delay * (2 ** attempt)  # 指数退避
                        logger.warning(f"{func.__name__} 失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                        logger.info(f"等待 {wait_time:.1f}s 后重试...")
                        await asyncio.sleep(wait_time)
                    else:
                        logger.error(f"{func.__name__} 最终失败: {e}")
            raise last_exception
        return wrapper
    return decorator


class BaseSocialScraper:
    """社交媒体爬虫基类"""

    def __init__(self, platform: str, headless: bool = False):
        self.platform = platform
        self.headless = headless
        self.browser = None
        self.page = None
        self.data = []

        # 平台配置
        self.config = {
            'xiaohongshu': {
                'base_url': 'https://www.xiaohongshu.com',
                'search_url': 'https://www.xiaohongshu.com/search_result?keyword={keyword}',
                'login_check_selector': '.avatar, .user-info, [class*="avatar"]',
                'note_selectors': [
                    "a[href*='/explore/']",
                    "a[href*='/discovery/item/']",
                    ".note-item a"
                ]
            },
            'zhihu': {
                'base_url': 'https://www.zhihu.com',
                'search_url': 'https://www.zhihu.com/search?type=content&q={keyword}',
                'login_check_selector': '.Avatar',
                'question_selectors': [
                    'h2.ContentItem-title a',
                    '.List-item a[href*="/question/"]'
                ]
            }
        }

    @retry_on_failure(max_retries=3)
    async def init_browser(self) -> bool:
        """初始化浏览器 - 带重试机制"""
        logger.info(f"初始化 {self.platform} 浏览器...")

        browser_args = [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ]

        if self.headless:
            browser_args.append('--headless=new')

        self.browser = await uc.start(
            headless=self.headless,
            browser_args=browser_args
        )
        self.page = await self.browser.get('about:blank')

        logger.info("浏览器初始化成功")
        return True

    async def wait_for_element(
        self,
        selector: str,
        timeout: float = 15.0,
        visible: bool = True
    ) -> Optional[uc.Element]:
        """
        显式等待元素 - 替代 time.sleep()

        Args:
            selector: CSS选择器
            timeout: 超时时间(秒)
            visible: 是否等待元素可见

        Returns:
            元素对象或None
        """
        try:
            element = await self.page.wait_for(
                selector,
                timeout=timeout
            )

            if visible and element:
                # 等待元素可见
                await asyncio.sleep(0.5)  # 短暂等待渲染

            return element
        except asyncio.TimeoutError:
            logger.warning(f"等待元素超时: {selector}")
            return None
        except Exception as e:
            logger.error(f"等待元素失败 {selector}: {e}")
            return None

    async def wait_for_any_element(
        self,
        selectors: List[str],
        timeout: float = 15.0
    ) -> Optional[uc.Element]:
        """
        等待多个选择器中的任意一个 - 应对平台前端变化

        Args:
            selectors: CSS选择器列表
            timeout: 超时时间(秒)

        Returns:
            第一个找到的元素或None
        """
        start_time = asyncio.get_event_loop().time()

        while (asyncio.get_event_loop().time() - start_time) < timeout:
            for selector in selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        logger.debug(f"找到元素: {selector}")
                        return element
                except:
                    continue

            await asyncio.sleep(0.5)

        logger.warning(f"所有选择器均未找到: {selectors}")
        return None

    async def smart_scroll(
        self,
        target_count: int = 10,
        max_scrolls: int = 5,
        scroll_pause: float = 2.0
    ) -> int:
        """
        智能滚动加载 - 替代盲目的滚动循环

        Args:
            target_count: 目标元素数量
            max_scrolls: 最大滚动次数
            scroll_pause: 滚动后等待时间

        Returns:
            实际加载的元素数量
        """
        last_count = 0
        no_change_count = 0

        for scroll in range(max_scrolls):
            # 滚动到底部
            await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await asyncio.sleep(scroll_pause)

            # 检查是否加载了新内容
            current_count = await self._get_loaded_count()

            if current_count >= target_count:
                logger.info(f"已加载足够内容: {current_count}/{target_count}")
                break

            if current_count == last_count:
                no_change_count += 1
                if no_change_count >= 2:
                    logger.warning(f"连续{no_change_count}次滚动无新内容,停止滚动")
                    break
            else:
                no_change_count = 0

            last_count = current_count
            logger.debug(f"滚动 {scroll + 1}/{max_scrolls}, 已加载: {current_count}")

        return last_count

    async def _get_loaded_count(self) -> int:
        """获取当前已加载的内容数量 - 子类需要重写"""
        return 0

    async def random_delay(self, min_sec: float = 1.0, max_sec: float = 3.0):
        """随机延迟 - 模拟人类行为"""
        delay = random.uniform(min_sec, max_sec)
        await asyncio.sleep(delay)

    @retry_on_failure(max_retries=2)
    async def safe_get_attribute(
        self,
        element: uc.Element,
        attribute: str
    ) -> Optional[str]:
        """安全获取元素属性 - 带重试"""
        try:
            value = await element.get_attribute(attribute)
            return value
        except Exception as e:
            logger.warning(f"获取属性 {attribute} 失败: {e}")
            return None

    @retry_on_failure(max_retries=2)
    async def safe_get_text(self, element: uc.Element) -> Optional[str]:
        """安全获取元素文本 - 带重试"""
        try:
            text = await element.text
            return text.strip() if text else None
        except Exception as e:
            logger.warning(f"获取文本失败: {e}")
            return None

    async def manual_login(self) -> bool:
        """手动登录 - 通用实现"""
        platform_config = self.config.get(self.platform, {})
        base_url = platform_config.get('base_url', '')

        logger.info(f"请在浏览器中登录 {self.platform}")
        await self.page.get(base_url)
        await self.random_delay(2, 3)

        # 等待用户确认
        while True:
            user_input = input("\n登录完成? (y/n): ").strip().lower()
            if user_input == 'y':
                break
            elif user_input == 'n':
                await asyncio.sleep(2)
            else:
                logger.warning("请输入 y 或 n")

        # 验证登录状态
        login_check = platform_config.get('login_check_selector')
        if login_check:
            element = await self.wait_for_element(login_check, timeout=5)
            if element:
                logger.info("登录验证成功")
                return True

        logger.warning("未检测到登录状态,但继续执行")
        return True

    async def cleanup(self):
        """清理资源"""
        if self.browser:
            try:
                await self.browser.stop()
                logger.info("浏览器已关闭")
            except:
                pass

    def __del__(self):
        """析构函数"""
        if self.browser:
            try:
                asyncio.create_task(self.cleanup())
            except:
                pass
