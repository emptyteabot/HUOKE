#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
统一重试装饰器模块
提供可配置的重试机制,支持指数退避和错误分类
"""

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
    after_log
)
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    StaleElementReferenceException,
    WebDriverException,
    ElementClickInterceptedException,
    ElementNotInteractableException
)
import logging
from functools import wraps

# 配置日志
logger = logging.getLogger(__name__)


# ==================== 错误分类 ====================

# 可重试错误 - 临时性问题,重试可能成功
RETRYABLE_EXCEPTIONS = (
    TimeoutException,              # 超时
    NoSuchElementException,        # 元素未找到
    StaleElementReferenceException,  # 元素过期
    ElementClickInterceptedException,  # 点击被拦截
    ElementNotInteractableException,   # 元素不可交互
    ConnectionError,               # 连接错误
    ConnectionResetError,          # 连接重置
)

# 不可重试错误 - 致命错误,重试无意义
NON_RETRYABLE_EXCEPTIONS = (
    KeyboardInterrupt,             # 用户中断
    SystemExit,                    # 系统退出
    MemoryError,                   # 内存错误
)


# ==================== 重试装饰器 ====================

def scraper_retry(
    max_attempts=3,
    min_wait=2,
    max_wait=10,
    multiplier=1,
    log_level=logging.INFO
):
    """
    爬虫重试装饰器

    参数:
        max_attempts: 最大重试次数 (默认3次)
        min_wait: 最小等待时间(秒) (默认2秒)
        max_wait: 最大等待时间(秒) (默认10秒)
        multiplier: 指数退避乘数 (默认1)
        log_level: 日志级别 (默认INFO)

    使用示例:
        @scraper_retry(max_attempts=3, min_wait=2, max_wait=10)
        def scrape_data():
            # 爬取逻辑
            pass
    """
    def decorator(func):
        @retry(
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential(multiplier=multiplier, min=min_wait, max=max_wait),
            retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
            before_sleep=before_sleep_log(logger, log_level),
            after=after_log(logger, log_level)
        )
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except NON_RETRYABLE_EXCEPTIONS:
                # 不可重试错误直接抛出
                logger.error(f"遇到不可重试错误,停止执行: {func.__name__}")
                raise
            except Exception as e:
                # 记录错误信息
                logger.warning(f"函数 {func.__name__} 执行失败: {str(e)}")
                raise

        return wrapper
    return decorator


def critical_operation_retry(max_attempts=5):
    """
    关键操作重试装饰器 - 更激进的重试策略
    用于登录、初始化等关键操作

    参数:
        max_attempts: 最大重试次数 (默认5次)
    """
    return scraper_retry(
        max_attempts=max_attempts,
        min_wait=3,
        max_wait=15,
        multiplier=2,
        log_level=logging.WARNING
    )


def quick_retry(max_attempts=2):
    """
    快速重试装饰器 - 轻量级重试
    用于简单操作,快速失败

    参数:
        max_attempts: 最大重试次数 (默认2次)
    """
    return scraper_retry(
        max_attempts=max_attempts,
        min_wait=1,
        max_wait=3,
        multiplier=1,
        log_level=logging.DEBUG
    )


# ==================== 手动重试辅助函数 ====================

def retry_on_failure(func, max_attempts=3, delay=2, *args, **kwargs):
    """
    手动重试函数 - 用于不适合装饰器的场景

    参数:
        func: 要执行的函数
        max_attempts: 最大尝试次数
        delay: 重试间隔(秒)
        *args, **kwargs: 传递给func的参数

    返回:
        (success: bool, result: Any, error: Exception)
    """
    import time

    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(f"尝试执行 {func.__name__} (第 {attempt}/{max_attempts} 次)")
            result = func(*args, **kwargs)
            logger.info(f"✓ {func.__name__} 执行成功")
            return True, result, None

        except NON_RETRYABLE_EXCEPTIONS as e:
            logger.error(f"✗ 遇到不可重试错误: {str(e)}")
            return False, None, e

        except RETRYABLE_EXCEPTIONS as e:
            logger.warning(f"✗ 第 {attempt} 次尝试失败: {str(e)}")
            if attempt < max_attempts:
                wait_time = delay * (2 ** (attempt - 1))  # 指数退避
                logger.info(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
            else:
                logger.error(f"✗ 达到最大重试次数,放弃执行")
                return False, None, e

        except Exception as e:
            logger.error(f"✗ 未知错误: {str(e)}")
            return False, None, e

    return False, None, Exception("重试失败")


# ==================== 错误恢复策略 ====================

class RetryContext:
    """重试上下文管理器 - 提供错误恢复能力"""

    def __init__(self, operation_name, max_attempts=3, on_retry=None):
        """
        参数:
            operation_name: 操作名称
            max_attempts: 最大尝试次数
            on_retry: 重试前的回调函数 (可选)
        """
        self.operation_name = operation_name
        self.max_attempts = max_attempts
        self.on_retry = on_retry
        self.attempt = 0
        self.last_error = None

    def __enter__(self):
        self.attempt += 1
        logger.info(f"开始执行 {self.operation_name} (第 {self.attempt}/{self.max_attempts} 次)")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            logger.info(f"✓ {self.operation_name} 执行成功")
            return True

        self.last_error = exc_val

        # 不可重试错误
        if exc_type in NON_RETRYABLE_EXCEPTIONS:
            logger.error(f"✗ {self.operation_name} 遇到不可重试错误: {exc_val}")
            return False

        # 可重试错误
        if exc_type in RETRYABLE_EXCEPTIONS:
            logger.warning(f"✗ {self.operation_name} 失败: {exc_val}")

            if self.attempt < self.max_attempts:
                logger.info(f"准备重试 (剩余 {self.max_attempts - self.attempt} 次)")

                # 执行重试前的回调
                if self.on_retry:
                    try:
                        self.on_retry(self.attempt, exc_val)
                    except Exception as e:
                        logger.error(f"重试回调执行失败: {e}")

                return True  # 抑制异常,继续重试
            else:
                logger.error(f"✗ {self.operation_name} 达到最大重试次数")
                return False

        # 其他错误
        logger.error(f"✗ {self.operation_name} 遇到未知错误: {exc_val}")
        return False

    def should_retry(self):
        """判断是否应该继续重试"""
        return self.attempt < self.max_attempts


# ==================== 使用示例 ====================

if __name__ == "__main__":
    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # 示例1: 使用装饰器
    @scraper_retry(max_attempts=3, min_wait=1, max_wait=5)
    def example_scrape():
        print("执行爬取操作...")
        import random
        if random.random() < 0.7:
            raise TimeoutException("模拟超时")
        return "成功"

    # 示例2: 使用上下文管理器
    def example_with_context():
        ctx = RetryContext("测试操作", max_attempts=3)

        while ctx.should_retry():
            with ctx:
                print("执行操作...")
                import random
                if random.random() < 0.7:
                    raise NoSuchElementException("模拟元素未找到")
                print("操作成功!")
                break

    # 示例3: 手动重试
    def example_manual():
        def risky_operation():
            import random
            if random.random() < 0.7:
                raise ConnectionError("模拟连接错误")
            return "成功"

        success, result, error = retry_on_failure(risky_operation, max_attempts=3, delay=1)
        if success:
            print(f"操作成功: {result}")
        else:
            print(f"操作失败: {error}")

    print("=" * 60)
    print("重试装饰器测试")
    print("=" * 60)

    try:
        result = example_scrape()
        print(f"结果: {result}")
    except Exception as e:
        print(f"最终失败: {e}")

    print("\n" + "=" * 60)
    print("上下文管理器测试")
    print("=" * 60)
    example_with_context()

    print("\n" + "=" * 60)
    print("手动重试测试")
    print("=" * 60)
    example_manual()
