"""
邮箱查找模块

支持多种方式查找邮箱:
1. Hunter.io API - 根据姓名+公司查找
2. 邮箱格式推测 - 根据公司域名生成可能的邮箱
3. 邮箱验证 - 验证邮箱是否有效
"""

import requests
import re
from typing import Dict, List, Optional
import dns.resolver
import smtplib
import socket


class EmailFinder:
    """邮箱查找器"""

    def __init__(self, hunter_api_key: Optional[str] = None):
        """
        初始化邮箱查找器

        Args:
            hunter_api_key: Hunter.io API密钥 (可选)
                           注册地址: https://hunter.io/
                           免费版: 25次/月
        """
        self.hunter_api_key = hunter_api_key
        self.hunter_base_url = "https://api.hunter.io/v2"

    def find_email_by_hunter(self, first_name: str, last_name: str, domain: str) -> Optional[Dict]:
        """
        使用Hunter.io查找邮箱

        Args:
            first_name: 名
            last_name: 姓
            domain: 公司域名 (例如: google.com)

        Returns:
            Dict: {
                'email': 'john@google.com',
                'score': 95,
                'sources': [...],
                'verification': 'valid'
            }
        """
        if not self.hunter_api_key:
            print("⚠️ 未配置Hunter.io API Key")
            return None

        try:
            url = f"{self.hunter_base_url}/email-finder"
            params = {
                'domain': domain,
                'first_name': first_name,
                'last_name': last_name,
                'api_key': self.hunter_api_key
            }

            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if response.status_code == 200 and data.get('data'):
                email_data = data['data']
                return {
                    'email': email_data.get('email'),
                    'score': email_data.get('score', 0),
                    'sources': email_data.get('sources', []),
                    'verification': email_data.get('verification', {}).get('status'),
                    'method': 'hunter.io'
                }

        except Exception as e:
            print(f"❌ Hunter.io查找失败: {e}")

        return None

    def guess_email_patterns(self, first_name: str, last_name: str, domain: str) -> List[str]:
        """
        根据常见格式推测邮箱

        Args:
            first_name: 名
            last_name: 姓
            domain: 公司域名

        Returns:
            List[str]: 可能的邮箱列表
        """
        first = first_name.lower().strip()
        last = last_name.lower().strip()

        # 常见邮箱格式
        patterns = [
            f"{first}.{last}@{domain}",           # john.doe@company.com
            f"{first}{last}@{domain}",            # johndoe@company.com
            f"{first}@{domain}",                  # john@company.com
            f"{last}@{domain}",                   # doe@company.com
            f"{first[0]}{last}@{domain}",         # jdoe@company.com
            f"{first}{last[0]}@{domain}",         # johnd@company.com
            f"{first}_{last}@{domain}",           # john_doe@company.com
            f"{first}-{last}@{domain}",           # john-doe@company.com
            f"{last}.{first}@{domain}",           # doe.john@company.com
            f"{last}{first}@{domain}",            # doejohn@company.com
        ]

        return patterns

    def verify_email_format(self, email: str) -> bool:
        """验证邮箱格式是否正确"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    def verify_domain_mx(self, domain: str) -> bool:
        """
        验证域名是否有MX记录

        Args:
            domain: 域名

        Returns:
            bool: 是否有MX记录
        """
        try:
            dns.resolver.resolve(domain, 'MX')
            return True
        except:
            return False

    def verify_email_smtp(self, email: str) -> Dict:
        """
        通过SMTP验证邮箱是否存在

        注意: 很多邮件服务器会拒绝验证,所以结果不一定准确

        Args:
            email: 邮箱地址

        Returns:
            Dict: {
                'valid': bool,
                'message': str
            }
        """
        domain = email.split('@')[1]

        try:
            # 获取MX记录
            mx_records = dns.resolver.resolve(domain, 'MX')
            mx_host = str(mx_records[0].exchange)

            # 连接SMTP服务器
            server = smtplib.SMTP(timeout=10)
            server.set_debuglevel(0)
            server.connect(mx_host)
            server.helo(server.local_hostname)
            server.mail('verify@example.com')
            code, message = server.rcpt(email)
            server.quit()

            # 250 = 邮箱存在
            if code == 250:
                return {'valid': True, 'message': '邮箱存在'}
            else:
                return {'valid': False, 'message': f'邮箱不存在 (code: {code})'}

        except Exception as e:
            return {'valid': None, 'message': f'无法验证: {str(e)}'}

    def find_email(self, first_name: str, last_name: str, company: str, domain: Optional[str] = None) -> Dict:
        """
        综合查找邮箱

        Args:
            first_name: 名
            last_name: 姓
            company: 公司名称
            domain: 公司域名 (可选,会自动推测)

        Returns:
            Dict: {
                'email': 'john@company.com',
                'confidence': 'high',  # high/medium/low
                'method': 'hunter.io',
                'alternatives': [...]
            }
        """
        result = {
            'email': None,
            'confidence': 'low',
            'method': None,
            'alternatives': []
        }

        # 如果没有域名,尝试推测
        if not domain:
            domain = self._guess_domain(company)

        if not domain:
            return result

        # 方法1: 使用Hunter.io
        if self.hunter_api_key:
            hunter_result = self.find_email_by_hunter(first_name, last_name, domain)
            if hunter_result and hunter_result.get('email'):
                result['email'] = hunter_result['email']
                result['confidence'] = 'high' if hunter_result.get('score', 0) > 70 else 'medium'
                result['method'] = 'hunter.io'
                return result

        # 方法2: 推测邮箱格式
        guessed_emails = self.guess_email_patterns(first_name, last_name, domain)

        # 验证域名MX记录
        if not self.verify_domain_mx(domain):
            result['alternatives'] = guessed_emails
            return result

        # 尝试验证每个推测的邮箱
        for email in guessed_emails:
            # 先验证格式
            if not self.verify_email_format(email):
                continue

            # SMTP验证 (可选,因为很多服务器会拒绝)
            # verification = self.verify_email_smtp(email)
            # if verification.get('valid'):
            #     result['email'] = email
            #     result['confidence'] = 'medium'
            #     result['method'] = 'smtp_verification'
            #     break

            result['alternatives'].append(email)

        # 如果有推测的邮箱,返回第一个作为最可能的
        if result['alternatives']:
            result['email'] = result['alternatives'][0]
            result['confidence'] = 'low'
            result['method'] = 'pattern_guess'

        return result

    def _guess_domain(self, company: str) -> Optional[str]:
        """
        根据公司名称推测域名

        Args:
            company: 公司名称

        Returns:
            str: 域名
        """
        # 移除常见后缀
        company = company.lower().strip()
        company = re.sub(r'(inc|ltd|llc|corp|corporation|company|co|limited)\.?$', '', company)
        company = company.strip()

        # 移除特殊字符
        company = re.sub(r'[^a-z0-9]', '', company)

        # 常见域名后缀
        tlds = ['.com', '.cn', '.net', '.org']

        # 尝试每个后缀
        for tld in tlds:
            domain = company + tld
            if self.verify_domain_mx(domain):
                return domain

        return None

    def batch_find_emails(self, leads: List[Dict]) -> List[Dict]:
        """
        批量查找邮箱

        Args:
            leads: 线索列表 [{'name': 'John Doe', 'company': 'Google'}, ...]

        Returns:
            List[Dict]: 更新后的线索列表
        """
        results = []

        for idx, lead in enumerate(leads):
            print(f"🔍 [{idx+1}/{len(leads)}] 查找邮箱: {lead.get('name')} @ {lead.get('company')}")

            # 解析姓名
            name = lead.get('name', '')
            name_parts = name.split()

            if len(name_parts) >= 2:
                first_name = name_parts[0]
                last_name = name_parts[-1]
            else:
                first_name = name
                last_name = ''

            # 查找邮箱
            email_result = self.find_email(
                first_name=first_name,
                last_name=last_name,
                company=lead.get('company', ''),
                domain=lead.get('domain')
            )

            # 更新线索
            lead['email'] = email_result.get('email', '')
            lead['email_confidence'] = email_result.get('confidence', 'low')
            lead['email_method'] = email_result.get('method', 'unknown')
            lead['email_alternatives'] = email_result.get('alternatives', [])

            results.append(lead)

            print(f"  ✅ 邮箱: {lead['email']} (置信度: {lead['email_confidence']})")

        return results


# 免费的邮箱验证API (备选方案)
class FreeEmailVerifier:
    """免费邮箱验证服务"""

    @staticmethod
    def verify_with_emailrep(email: str) -> Dict:
        """
        使用EmailRep.io验证邮箱

        免费API,无需注册
        """
        try:
            url = f"https://emailrep.io/{email}"
            response = requests.get(url, timeout=10)
            data = response.json()

            return {
                'email': email,
                'reputation': data.get('reputation', 'unknown'),
                'suspicious': data.get('suspicious', False),
                'details': data.get('details', {})
            }

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def verify_with_kickbox(email: str, api_key: str) -> Dict:
        """
        使用Kickbox验证邮箱

        注册地址: https://kickbox.com/
        免费版: 100次/月
        """
        try:
            url = f"https://api.kickbox.com/v2/verify"
            params = {'email': email, 'apikey': api_key}

            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            return {
                'email': email,
                'result': data.get('result'),  # deliverable/undeliverable/risky/unknown
                'reason': data.get('reason'),
                'role': data.get('role'),
                'free': data.get('free'),
                'disposable': data.get('disposable')
            }

        except Exception as e:
            return {'error': str(e)}


# 测试函数
def test_email_finder():
    """测试邮箱查找功能"""
    print("🚀 测试邮箱查找...")

    # 初始化 (不使用Hunter.io API)
    finder = EmailFinder()

    # 测试1: 推测邮箱
    print("\n" + "="*50)
    print("测试1: 推测邮箱格式")
    print("="*50)

    result = finder.find_email(
        first_name="John",
        last_name="Doe",
        company="Google",
        domain="google.com"
    )

    print(f"邮箱: {result['email']}")
    print(f"置信度: {result['confidence']}")
    print(f"方法: {result['method']}")
    print(f"备选: {result['alternatives'][:3]}")

    # 测试2: 批量查找
    print("\n" + "="*50)
    print("测试2: 批量查找邮箱")
    print("="*50)

    leads = [
        {'name': 'Elon Musk', 'company': 'Tesla'},
        {'name': 'Tim Cook', 'company': 'Apple'},
        {'name': 'Sundar Pichai', 'company': 'Google'}
    ]

    results = finder.batch_find_emails(leads)

    for lead in results:
        print(f"\n{lead['name']} @ {lead['company']}")
        print(f"  邮箱: {lead['email']}")
        print(f"  置信度: {lead['email_confidence']}")


if __name__ == "__main__":
    test_email_finder()
