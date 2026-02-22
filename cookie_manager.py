#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cookie管理器 - 统一Cookie持久化方案
支持多平台、多账号、自动过期检测、加密存储
"""

import os
import pickle
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import logging
from cryptography.fernet import Fernet
import hashlib


class CookieManager:
    """Cookie管理器"""

    def __init__(self, storage_dir: str = "cookies", encrypt: bool = True):
        """
        初始化Cookie管理器

        Args:
            storage_dir: Cookie存储目录
            encrypt: 是否加密存储
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.encrypt = encrypt
        self.cipher = None

        # 设置日志
        self.logger = logging.getLogger(__name__)

        # 初始化加密
        if self.encrypt:
            self._init_encryption()

        # Cookie有效期配置(天)
        self.validity_days = {
            'xiaohongshu': 30,
            'zhihu': 30,
            'weibo': 30
        }

        # 平台验证URL
        self.verify_urls = {
            'xiaohongshu': 'https://www.xiaohongshu.com',
            'zhihu': 'https://www.zhihu.com',
            'weibo': 'https://weibo.com'
        }

        # 登录检测选择器
        self.login_selectors = {
            'xiaohongshu': '.avatar, .user-avatar, [class*="avatar"]',
            'zhihu': '.Avatar, [class*="Avatar"]',
            'weibo': '.Avatar_face, [class*="avatar"]'
        }

    def _init_encryption(self):
        """初始化加密密钥"""
        key_file = self.storage_dir / ".key"

        if key_file.exists():
            with open(key_file, 'rb') as f:
                key = f.read()
        else:
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            # 隐藏密钥文件
            if os.name == 'nt':  # Windows
                os.system(f'attrib +h "{key_file}"')

        self.cipher = Fernet(key)

    def _get_cookie_path(self, platform: str, account: str) -> Path:
        """获取Cookie文件路径"""
        # 使用账号哈希避免文件名过长
        account_hash = hashlib.md5(account.encode()).hexdigest()[:8]
        filename = f"{platform}_{account_hash}.pkl"
        return self.storage_dir / filename

    def _get_metadata_path(self, platform: str, account: str) -> Path:
        """获取元数据文件路径"""
        account_hash = hashlib.md5(account.encode()).hexdigest()[:8]
        filename = f"{platform}_{account_hash}_meta.json"
        return self.storage_dir / filename

    def save_cookies(self, platform: str, account: str, cookies: List[Dict]) -> bool:
        """
        保存Cookie

        Args:
            platform: 平台名称 (xiaohongshu/zhihu/weibo)
            account: 账号标识
            cookies: Cookie列表

        Returns:
            是否保存成功
        """
        try:
            cookie_path = self._get_cookie_path(platform, account)
            meta_path = self._get_metadata_path(platform, account)

            # 序列化Cookie
            cookie_data = pickle.dumps(cookies)

            # 加密
            if self.encrypt:
                cookie_data = self.cipher.encrypt(cookie_data)

            # 保存Cookie
            with open(cookie_path, 'wb') as f:
                f.write(cookie_data)

            # 保存元数据
            metadata = {
                'platform': platform,
                'account': account,
                'saved_at': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(days=self.validity_days.get(platform, 30))).isoformat(),
                'cookie_count': len(cookies)
            }

            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            self.logger.info(f"✓ Cookie已保存: {platform} - {account}")
            return True

        except Exception as e:
            self.logger.error(f"✗ 保存Cookie失败: {e}")
            return False

    def load_cookies(self, platform: str, account: str) -> Optional[List[Dict]]:
        """
        加载Cookie

        Args:
            platform: 平台名称
            account: 账号标识

        Returns:
            Cookie列表,失败返回None
        """
        try:
            cookie_path = self._get_cookie_path(platform, account)

            if not cookie_path.exists():
                self.logger.warning(f"Cookie文件不存在: {platform} - {account}")
                return None

            # 读取Cookie
            with open(cookie_path, 'rb') as f:
                cookie_data = f.read()

            # 解密
            if self.encrypt:
                cookie_data = self.cipher.decrypt(cookie_data)

            # 反序列化
            cookies = pickle.loads(cookie_data)

            self.logger.info(f"✓ Cookie已加载: {platform} - {account} ({len(cookies)}条)")
            return cookies

        except Exception as e:
            self.logger.error(f"✗ 加载Cookie失败: {e}")
            return None

    def get_metadata(self, platform: str, account: str) -> Optional[Dict]:
        """获取Cookie元数据"""
        try:
            meta_path = self._get_metadata_path(platform, account)

            if not meta_path.exists():
                return None

            with open(meta_path, 'r', encoding='utf-8') as f:
                return json.load(f)

        except Exception as e:
            self.logger.error(f"✗ 读取元数据失败: {e}")
            return None

    def is_expired(self, platform: str, account: str) -> bool:
        """
        检查Cookie是否过期

        Args:
            platform: 平台名称
            account: 账号标识

        Returns:
            是否过期
        """
        metadata = self.get_metadata(platform, account)

        if not metadata:
            return True

        try:
            expires_at = datetime.fromisoformat(metadata['expires_at'])
            is_expired = datetime.now() > expires_at

            if is_expired:
                self.logger.info(f"Cookie已过期: {platform} - {account}")

            return is_expired

        except Exception as e:
            self.logger.error(f"检查过期时间失败: {e}")
            return True

    def is_valid(self, driver, platform: str, account: str) -> bool:
        """
        验证Cookie是否有效

        Args:
            driver: Selenium WebDriver实例
            platform: 平台名称
            account: 账号标识

        Returns:
            是否有效
        """
        try:
            # 检查是否过期
            if self.is_expired(platform, account):
                return False

            # 加载Cookie
            cookies = self.load_cookies(platform, account)
            if not cookies:
                return False

            # 访问平台首页
            verify_url = self.verify_urls.get(platform)
            if not verify_url:
                self.logger.error(f"不支持的平台: {platform}")
                return False

            driver.get(verify_url)
            time.sleep(2)

            # 添加Cookie
            for cookie in cookies:
                try:
                    driver.add_cookie(cookie)
                except Exception as e:
                    self.logger.warning(f"添加Cookie失败: {e}")

            # 刷新页面
            driver.refresh()
            time.sleep(3)

            # 检查登录状态
            from selenium.webdriver.common.by import By
            from selenium.common.exceptions import NoSuchElementException

            selector = self.login_selectors.get(platform)
            if not selector:
                return False

            try:
                driver.find_element(By.CSS_SELECTOR, selector)
                self.logger.info(f"✓ Cookie有效: {platform} - {account}")
                return True
            except NoSuchElementException:
                self.logger.warning(f"Cookie无效: {platform} - {account}")
                return False

        except Exception as e:
            self.logger.error(f"验证Cookie失败: {e}")
            return False

    def refresh_if_expired(self, driver, platform: str, account: str, login_callback) -> bool:
        """
        如果Cookie过期则刷新

        Args:
            driver: Selenium WebDriver实例
            platform: 平台名称
            account: 账号标识
            login_callback: 登录回调函数

        Returns:
            是否成功
        """
        try:
            # 检查是否有效
            if self.is_valid(driver, platform, account):
                return True

            self.logger.info(f"Cookie无效,需要重新登录: {platform} - {account}")

            # 调用登录回调
            if login_callback:
                success = login_callback(driver, platform)

                if success:
                    # 保存新Cookie
                    cookies = driver.get_cookies()
                    self.save_cookies(platform, account, cookies)
                    return True

            return False

        except Exception as e:
            self.logger.error(f"刷新Cookie失败: {e}")
            return False

    def delete_cookies(self, platform: str, account: str) -> bool:
        """删除Cookie"""
        try:
            cookie_path = self._get_cookie_path(platform, account)
            meta_path = self._get_metadata_path(platform, account)

            if cookie_path.exists():
                cookie_path.unlink()

            if meta_path.exists():
                meta_path.unlink()

            self.logger.info(f"✓ Cookie已删除: {platform} - {account}")
            return True

        except Exception as e:
            self.logger.error(f"✗ 删除Cookie失败: {e}")
            return False

    def list_accounts(self, platform: Optional[str] = None) -> List[Dict]:
        """
        列出所有账号

        Args:
            platform: 平台名称,None表示所有平台

        Returns:
            账号列表
        """
        accounts = []

        try:
            for meta_file in self.storage_dir.glob("*_meta.json"):
                try:
                    with open(meta_file, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)

                    if platform is None or metadata['platform'] == platform:
                        # 添加过期状态
                        metadata['is_expired'] = self.is_expired(
                            metadata['platform'],
                            metadata['account']
                        )
                        accounts.append(metadata)

                except Exception as e:
                    self.logger.warning(f"读取元数据失败: {meta_file} - {e}")
                    continue

            return accounts

        except Exception as e:
            self.logger.error(f"列出账号失败: {e}")
            return []

    def clean_expired(self) -> int:
        """清理过期Cookie"""
        cleaned = 0

        try:
            accounts = self.list_accounts()

            for account in accounts:
                if account['is_expired']:
                    if self.delete_cookies(account['platform'], account['account']):
                        cleaned += 1

            self.logger.info(f"✓ 清理了 {cleaned} 个过期Cookie")
            return cleaned

        except Exception as e:
            self.logger.error(f"清理过期Cookie失败: {e}")
            return 0


def demo():
    """演示用法"""
    print("="*60)
    print("Cookie管理器演示")
    print("="*60)

    # 创建管理器
    manager = CookieManager(encrypt=True)

    # 模拟Cookie数据
    test_cookies = [
        {'name': 'session_id', 'value': 'abc123', 'domain': '.xiaohongshu.com'},
        {'name': 'user_token', 'value': 'xyz789', 'domain': '.xiaohongshu.com'}
    ]

    # 保存Cookie
    print("\n1. 保存Cookie")
    manager.save_cookies('xiaohongshu', 'test_user', test_cookies)

    # 加载Cookie
    print("\n2. 加载Cookie")
    loaded = manager.load_cookies('xiaohongshu', 'test_user')
    print(f"加载了 {len(loaded) if loaded else 0} 条Cookie")

    # 检查过期
    print("\n3. 检查过期")
    expired = manager.is_expired('xiaohongshu', 'test_user')
    print(f"是否过期: {expired}")

    # 列出账号
    print("\n4. 列出所有账号")
    accounts = manager.list_accounts()
    for acc in accounts:
        print(f"  - {acc['platform']}: {acc['account']} (过期: {acc['is_expired']})")

    # 清理过期
    print("\n5. 清理过期Cookie")
    cleaned = manager.clean_expired()
    print(f"清理了 {cleaned} 个过期Cookie")

    print("\n" + "="*60)


if __name__ == '__main__':
    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    demo()
