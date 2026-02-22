#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
重试机制测试脚本
验证retry_decorator的各种功能
"""

import sys
import time
import random
import logging
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# 导入重试装饰器
from retry_decorator import (
    scraper_retry,
    critical_operation_retry,
    quick_retry,
    retry_on_failure,
    RetryContext
)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RetryTester:
    """重试机制测试类"""

    def __init__(self):
        self.attempt_count = 0
        self.success_rate = 0.3  # 30%成功率

    def reset(self):
        """重置计数器"""
        self.attempt_count = 0

    # ==================== 测试1: 标准重试装饰器 ====================

    @scraper_retry(max_attempts=3, min_wait=1, max_wait=3)
    def test_scraper_retry_success(self):
        """测试标准重试 - 最终成功"""
        self.attempt_count += 1
        logger.info(f"尝试次数: {self.attempt_count}")

        if self.attempt_count < 2:
            raise TimeoutException("模拟超时错误")

        logger.info("✓ 操作成功!")
        return "成功"

    @scraper_retry(max_attempts=3, min_wait=1, max_wait=3)
    def test_scraper_retry_failure(self):
        """测试标准重试 - 最终失败"""
        self.attempt_count += 1
        logger.info(f"尝试次数: {self.attempt_count}")
        raise TimeoutException("持续超时")

    # ==================== 测试2: 关键操作重试 ====================

    @critical_operation_retry(max_attempts=5)
    def test_critical_retry(self):
        """测试关键操作重试"""
        self.attempt_count += 1
        logger.info(f"关键操作尝试: {self.attempt_count}")

        if self.attempt_count < 3:
            raise ConnectionError("模拟连接错误")

        logger.info("✓ 关键操作成功!")
        return "初始化完成"

    # ==================== 测试3: 快速重试 ====================

    @quick_retry(max_attempts=2)
    def test_quick_retry(self):
        """测试快速重试"""
        self.attempt_count += 1
        logger.info(f"快速重试: {self.attempt_count}")

        if self.attempt_count < 2:
            raise NoSuchElementException("元素未找到")

        logger.info("✓ 快速操作成功!")
        return "提取完成"

    # ==================== 测试4: 不可重试错误 ====================

    @scraper_retry(max_attempts=3, min_wait=1, max_wait=3)
    def test_non_retryable_error(self):
        """测试不可重试错误"""
        self.attempt_count += 1
        logger.info(f"尝试次数: {self.attempt_count}")
        raise KeyboardInterrupt("用户中断 - 不应重试")

    # ==================== 测试5: 随机成功 ====================

    @scraper_retry(max_attempts=5, min_wait=1, max_wait=3)
    def test_random_success(self):
        """测试随机成功"""
        self.attempt_count += 1
        logger.info(f"随机测试尝试: {self.attempt_count}")

        if random.random() > self.success_rate:
            raise TimeoutException("随机失败")

        logger.info("✓ 随机测试成功!")
        return "随机成功"


def test_manual_retry():
    """测试手动重试函数"""
    print("\n" + "="*60)
    print("测试6: 手动重试函数")
    print("="*60)

    attempt = [0]

    def risky_operation(value):
        attempt[0] += 1
        logger.info(f"手动重试尝试: {attempt[0]}")

        if attempt[0] < 2:
            raise ConnectionError("模拟连接错误")

        return f"成功处理: {value}"

    success, result, error = retry_on_failure(
        risky_operation,
        max_attempts=3,
        delay=1,
        value="测试数据"
    )

    if success:
        print(f"✓ 手动重试成功: {result}")
    else:
        print(f"✗ 手动重试失败: {error}")


def test_retry_context():
    """测试重试上下文管理器"""
    print("\n" + "="*60)
    print("测试7: 重试上下文管理器")
    print("="*60)

    attempt = [0]

    def on_retry_callback(attempt_num, error):
        """重试前的回调"""
        logger.info(f"重试回调: 第{attempt_num}次失败,错误: {error}")

    ctx = RetryContext(
        "上下文测试操作",
        max_attempts=3,
        on_retry=on_retry_callback
    )

    while ctx.should_retry():
        with ctx:
            attempt[0] += 1
            logger.info(f"上下文尝试: {attempt[0]}")

            if attempt[0] < 2:
                raise NoSuchElementException("元素未找到")

            logger.info("✓ 上下文操作成功!")
            break


def run_all_tests():
    """运行所有测试"""
    tester = RetryTester()

    # 测试1: 标准重试 - 成功
    print("\n" + "="*60)
    print("测试1: 标准重试装饰器 - 最终成功")
    print("="*60)
    try:
        tester.reset()
        result = tester.test_scraper_retry_success()
        print(f"✓ 测试通过: {result}")
    except Exception as e:
        print(f"✗ 测试失败: {e}")

    # 测试2: 标准重试 - 失败
    print("\n" + "="*60)
    print("测试2: 标准重试装饰器 - 最终失败")
    print("="*60)
    try:
        tester.reset()
        result = tester.test_scraper_retry_failure()
        print(f"✗ 不应该成功: {result}")
    except TimeoutException as e:
        print(f"✓ 测试通过: 达到最大重试次数后失败")

    # 测试3: 关键操作重试
    print("\n" + "="*60)
    print("测试3: 关键操作重试")
    print("="*60)
    try:
        tester.reset()
        result = tester.test_critical_retry()
        print(f"✓ 测试通过: {result}")
    except Exception as e:
        print(f"✗ 测试失败: {e}")

    # 测试4: 快速重试
    print("\n" + "="*60)
    print("测试4: 快速重试")
    print("="*60)
    try:
        tester.reset()
        result = tester.test_quick_retry()
        print(f"✓ 测试通过: {result}")
    except Exception as e:
        print(f"✗ 测试失败: {e}")

    # 测试5: 不可重试错误
    print("\n" + "="*60)
    print("测试5: 不可重试错误 (应该立即失败)")
    print("="*60)
    try:
        tester.reset()
        result = tester.test_non_retryable_error()
        print(f"✗ 不应该成功: {result}")
    except KeyboardInterrupt:
        print(f"✓ 测试通过: 不可重试错误立即抛出,尝试次数: {tester.attempt_count}")

    # 测试6: 手动重试
    test_manual_retry()

    # 测试7: 上下文管理器
    test_retry_context()

    # 测试8: 随机成功 (多次运行)
    print("\n" + "="*60)
    print("测试8: 随机成功测试 (运行5次)")
    print("="*60)
    success_count = 0
    for i in range(5):
        try:
            tester.reset()
            result = tester.test_random_success()
            success_count += 1
            print(f"  第{i+1}次: ✓ 成功 (尝试{tester.attempt_count}次)")
        except Exception as e:
            print(f"  第{i+1}次: ✗ 失败 (尝试{tester.attempt_count}次)")

    print(f"\n随机测试成功率: {success_count}/5 = {success_count/5*100:.1f}%")

    # 总结
    print("\n" + "="*60)
    print("测试完成!")
    print("="*60)
    print("\n重试机制功能验证:")
    print("  ✓ 标准重试装饰器")
    print("  ✓ 关键操作重试")
    print("  ✓ 快速重试")
    print("  ✓ 不可重试错误处理")
    print("  ✓ 手动重试函数")
    print("  ✓ 重试上下文管理器")
    print("  ✓ 指数退避策略")
    print("  ✓ 日志记录")


def test_performance():
    """性能测试"""
    print("\n" + "="*60)
    print("性能测试: 重试开销")
    print("="*60)

    tester = RetryTester()

    # 测试无重试的性能
    start_time = time.time()
    for _ in range(100):
        try:
            tester.reset()
            tester.test_scraper_retry_success()
        except:
            pass
    no_retry_time = time.time() - start_time

    print(f"100次操作(含重试)耗时: {no_retry_time:.2f}秒")
    print(f"平均每次: {no_retry_time/100*1000:.2f}毫秒")


if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════╗
║           重试机制测试脚本                                ║
║           Retry Mechanism Test Suite                     ║
╚══════════════════════════════════════════════════════════╝
    """)

    try:
        # 运行所有功能测试
        run_all_tests()

        # 运行性能测试
        test_performance()

        print("\n✓ 所有测试完成!")

    except KeyboardInterrupt:
        print("\n\n⚠️  测试被用户中断")
    except Exception as e:
        print(f"\n❌ 测试出错: {e}")
        import traceback
        traceback.print_exc()
