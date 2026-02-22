#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
邮件自动发送系统 - 信号驱动版
功能: 批量发送个性化邮件、追踪打开/点击率、失败重试、A/B测试、多触点序列
"""

import os
import time
import json
import hashlib
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
from pathlib import Path
import requests

# SendGrid
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, TrackingSettings, ClickTracking, OpenTracking

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('email_sender.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DeepSeekEmailGenerator:
    """DeepSeek AI邮件生成器"""

    def __init__(self, api_key: str = "sk-d86589fb80f248cea3f4a843eaebce5a"):
        self.api_key = api_key
        self.api_url = "https://api.deepseek.com/v1/chat/completions"

    def generate_email(self, lead_data: Dict, sequence_day: int = 1, ab_variant: str = "A") -> Dict:
        """
        生成信号驱动的个性化邮件

        Args:
            lead_data: 潜在客户数据
            sequence_day: 触点序列天数 (1, 3, 7, 14)
            ab_variant: A/B测试变体 (A或B)

        Returns:
            包含主题和内容的字典
        """
        prompt = self._build_prompt(lead_data, sequence_day, ab_variant)

        try:
            response = requests.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": "你是一位专业的留学咨询顾问,擅长撰写高转化率的获客邮件。"},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1000
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                return self._parse_email_content(content)
            else:
                logger.error(f"DeepSeek API错误: {response.status_code}")
                return self._get_fallback_email(lead_data, sequence_day)

        except Exception as e:
            logger.error(f"生成邮件失败: {e}")
            return self._get_fallback_email(lead_data, sequence_day)

    def _build_prompt(self, lead_data: Dict, sequence_day: int, ab_variant: str) -> str:
        """构建提示词"""
        name = lead_data.get('name', '同学')
        country = lead_data.get('target_country', '海外')
        degree = lead_data.get('target_degree', '研究生')
        major = lead_data.get('major', '相关专业')
        source = lead_data.get('source', '网络')
        budget = lead_data.get('budget', '50-80万')

        if sequence_day == 1:
            # Day 1: 首次触达(信号驱动)
            return f"""
请为留学咨询机构撰写一封高转化率的首次触达邮件。

**客户信息:**
- 姓名: {name}
- 意向: {country}{degree} - {major}
- 预算: {budget}
- 来源: {source}

**邮件要求:**
1. 使用4段式结构:
   - [信号]: 提及我们注意到他在{source}搜索{country}{degree}相关信息
   - [痛点]: 指出申请过程中最容易遇到的3个问题
   - [解决方案]: 用具体数字说明我们如何帮助(例: "帮助85%的学生拿到前30名校offer")
   - [CTA]: 超简单的行动号召(例: "回复'是'获取免费评估")

2. 主题行要求:
   - 变体{ab_variant}: {"个性化+好奇心" if ab_variant == "A" else "紧迫感+价值"}
   - 不超过30字
   - 包含{country}或{major}关键词

3. 正文要求:
   - 不超过200字
   - 使用真实案例(虚构但要具体)
   - 避免推销感,像朋友建议
   - 包含1个具体数字或时间点

**输出格式:**
主题: [邮件主题]
---
[邮件正文]
"""

        elif sequence_day == 3:
            # Day 3: 价值强化(案例证明)
            return f"""
请为留学咨询机构撰写第2封跟进邮件(首次邮件发送3天后)。

**客户信息:**
- 姓名: {name}
- 意向: {country}{degree} - {major}
- 预算: {budget}

**邮件要求:**
1. 开头提及上次邮件(轻描淡写,不施压)
2. 分享1个成功案例:
   - 相似背景的学生
   - 具体的学校名称和专业
   - 申请时间线和结果
3. 提供价值: 附上"{country}{major}申请时间规划表"
4. CTA: "点击下载规划表"

**输出格式:**
主题: [邮件主题]
---
[邮件正文]
"""

        elif sequence_day == 7:
            # Day 7: 稀缺性(限时优惠)
            return f"""
请为留学咨询机构撰写第3封跟进邮件(首次邮件发送7天后)。

**客户信息:**
- 姓名: {name}
- 意向: {country}{degree} - {major}

**邮件要求:**
1. 制造稀缺性: "本月仅剩3个免费评估名额"
2. 强调时间成本: "{country}{degree}申请季即将开始,现在准备刚刚好"
3. 降低决策门槛: "15分钟电话,不推销,只分析"
4. 社会证明: "本周已有12位同学预约"
5. CTA: "点击预约本周时间"

**输出格式:**
主题: [邮件主题]
---
[邮件正文]
"""

        else:  # Day 14
            # Day 14: 最后机会(FOMO)
            return f"""
请为留学咨询机构撰写最后一封跟进邮件(首次邮件发送14天后)。

**客户信息:**
- 姓名: {name}
- 意向: {country}{degree} - {major}

**邮件要求:**
1. 温和的告别: "这是我最后一次打扰"
2. FOMO: "很多同学已经开始准备,不想你错过最佳时机"
3. 最后的价值: 附上"{country}留学避坑指南PDF"
4. 开放式结尾: "如果将来需要,随时联系我"
5. CTA: "回复'需要'获取避坑指南"

**输出格式:**
主题: [邮件主题]
---
[邮件正文]
"""

    def _parse_email_content(self, content: str) -> Dict:
        """解析邮件内容"""
        lines = content.strip().split('\n')
        subject = ""
        body = []

        parsing_body = False
        for line in lines:
            if line.startswith('主题:'):
                subject = line.replace('主题:', '').strip()
            elif line.strip() == '---':
                parsing_body = True
            elif parsing_body:
                body.append(line)

        return {
            'subject': subject or "关于您的留学规划",
            'body': '\n'.join(body).strip()
        }

    def _get_fallback_email(self, lead_data: Dict, sequence_day: int) -> Dict:
        """备用邮件模板"""
        name = lead_data.get('name', '同学')
        country = lead_data.get('target_country', '海外')
        degree = lead_data.get('target_degree', '研究生')
        major = lead_data.get('major', '相关专业')

        templates = {
            1: {
                'subject': f'{name},关于{country}{major}申请的3个建议',
                'body': f'''Hi {name},

注意到您最近在关注{country}{degree}申请。

作为帮助过300+学生的顾问,我发现大部分申请者都会在这3个地方踩坑:
1. 时间规划太晚,错过最佳申请期
2. 选校定位不准,浪费申请费
3. 文书千篇一律,无法打动招生官

我们刚帮一位GPA 3.3的学生拿到了UCL的offer,关键就在于提前6个月开始规划。

回复"是"获取免费的申请时间规划表?

祝好,
留学顾问团队'''
            },
            3: {
                'subject': f'分享一个{country}{major}成功案例',
                'body': f'''Hi {name},

上次给您发的规划表不知道有没有帮到您?

今天想分享一个真实案例: 我们的学生小李,和您一样想申请{country}{major},通过3个月的准备,最终拿到了3所Top30学校的offer。

我整理了他的申请时间线和经验,可以发给您参考。

点击这里下载: [案例分析PDF]

祝好,
留学顾问团队'''
            },
            7: {
                'subject': f'本月最后3个免费评估名额',
                'body': f'''Hi {name},

{country}{degree}申请季马上开始了,现在准备刚刚好。

本月我们只剩3个免费评估名额,已经有12位同学预约了。

15分钟电话,我们会:
- 分析您的背景和竞争力
- 推荐3-5所匹配的学校
- 给出具体的准备建议

不推销,只分析。

点击预约本周时间: [预约链接]

祝好,
留学顾问团队'''
            },
            14: {
                'subject': f'{name},最后一次打扰',
                'body': f'''Hi {name},

这是我最后一次给您发邮件。

看到很多同学已经开始准备申请了,不想您错过最佳时机。

作为告别礼物,我整理了一份"{country}留学避坑指南",包含:
- 申请时间规划
- 选校定位方法
- 文书写作技巧
- 常见问题解答

回复"需要"我就发给您。

如果将来有需要,随时联系我。

祝一切顺利,
留学顾问团队'''
            }
        }

        return templates.get(sequence_day, templates[1])


class EmailAutoSender:
    """邮件自动发送器 - 信号驱动版"""

    def __init__(self, api_key: str, from_email: str, from_name: str = "留学顾问团队",
                 deepseek_api_key: str = "sk-d86589fb80f248cea3f4a843eaebce5a"):
        """
        初始化邮件发送器

        Args:
            api_key: SendGrid API密钥
            from_email: 发件人邮箱
            from_name: 发件人名称
            deepseek_api_key: DeepSeek API密钥
        """
        self.api_key = api_key
        self.from_email = from_email
        self.from_name = from_name
        self.client = SendGridAPIClient(api_key)

        # DeepSeek生成器
        self.email_generator = DeepSeekEmailGenerator(deepseek_api_key)

        # 发送配置
        self.rate_limit = 10  # 每分钟发送数量
        self.retry_times = 3  # 重试次数
        self.retry_delay = 5  # 重试延迟(秒)

        # 追踪数据存储
        self.tracking_file = "email_tracking.json"
        self.report_file = "email_report.xlsx"
        self.ab_test_file = "ab_test_results.json"

        # 加载追踪数据
        self.tracking_data = self._load_tracking_data()
        self.ab_test_data = self._load_ab_test_data()

    def _load_tracking_data(self) -> Dict:
        """加载追踪数据"""
        if os.path.exists(self.tracking_file):
            try:
                with open(self.tracking_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"加载追踪数据失败: {e}")
        return {
            "emails": {},
            "stats": {"sent": 0, "failed": 0, "opened": 0, "clicked": 0, "replied": 0, "converted": 0},
            "sequences": {}  # 追踪多触点序列
        }

    def _load_ab_test_data(self) -> Dict:
        """加载A/B测试数据"""
        if os.path.exists(self.ab_test_file):
            try:
                with open(self.ab_test_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"加载A/B测试数据失败: {e}")
        return {
            "variants": {
                "A": {"sent": 0, "opened": 0, "clicked": 0, "replied": 0},
                "B": {"sent": 0, "opened": 0, "clicked": 0, "replied": 0}
            }
        }

    def _save_tracking_data(self):
        """保存追踪数据"""
        try:
            with open(self.tracking_file, 'w', encoding='utf-8') as f:
                json.dump(self.tracking_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存追踪数据失败: {e}")

    def _save_ab_test_data(self):
        """保存A/B测试数据"""
        try:
            with open(self.ab_test_file, 'w', encoding='utf-8') as f:
                json.dump(self.ab_test_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存A/B测试数据失败: {e}")

    def _generate_tracking_id(self, email: str) -> str:
        """生成追踪ID"""
        timestamp = str(time.time())
        return hashlib.md5(f"{email}{timestamp}".encode()).hexdigest()[:16]

    def send_signal_driven_email(
        self,
        lead_data: Dict,
        sequence_day: int = 1,
        ab_variant: Optional[str] = None
    ) -> Dict:
        """
        发送信号驱动的个性化邮件

        Args:
            lead_data: 潜在客户数据
            sequence_day: 触点序列天数 (1, 3, 7, 14)
            ab_variant: A/B测试变体 (None=自动分配, "A"或"B")

        Returns:
            发送结果字典
        """
        to_email = lead_data.get('email')
        to_name = lead_data.get('name', '同学')

        # 自动分配A/B测试变体
        if ab_variant is None:
            ab_variant = "A" if hash(to_email) % 2 == 0 else "B"

        # 使用DeepSeek生成邮件
        logger.info(f"使用DeepSeek生成邮件: Day {sequence_day}, 变体 {ab_variant}")
        email_content = self.email_generator.generate_email(lead_data, sequence_day, ab_variant)

        subject = email_content['subject']
        body = email_content['body']

        # 转换为HTML
        html_content = self._text_to_html(body, to_name)

        # 生成追踪ID
        tracking_id = self._generate_tracking_id(to_email)

        # 发送邮件
        result = self.send_email(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            html_content=html_content,
            plain_content=body,
            tracking_id=tracking_id
        )

        # 记录序列和A/B测试信息
        if result['status'] == 'success':
            result['sequence_day'] = sequence_day
            result['ab_variant'] = ab_variant

            # 更新序列追踪
            if to_email not in self.tracking_data['sequences']:
                self.tracking_data['sequences'][to_email] = []
            self.tracking_data['sequences'][to_email].append({
                'day': sequence_day,
                'tracking_id': tracking_id,
                'sent_at': datetime.now().isoformat()
            })

            # 更新A/B测试数据
            self.ab_test_data['variants'][ab_variant]['sent'] += 1
            self._save_ab_test_data()

        return result

    def _text_to_html(self, text: str, name: str) -> str:
        """将纯文本转换为HTML"""
        # 简单的文本到HTML转换
        paragraphs = text.strip().split('\n\n')
        html_parts = []

        for para in paragraphs:
            if para.strip():
                # 处理列表
                if para.strip().startswith(('1.', '2.', '3.', '-', '•')):
                    items = [line.strip() for line in para.split('\n') if line.strip()]
                    html_parts.append('<ul>')
                    for item in items:
                        # 移除列表标记
                        clean_item = item.lstrip('123456789.-•').strip()
                        html_parts.append(f'<li>{clean_item}</li>')
                    html_parts.append('</ul>')
                else:
                    html_parts.append(f'<p>{para.strip()}</p>')

        body_html = '\n'.join(html_parts)

        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .content {{ background: #ffffff; padding: 30px; }}
        p {{ margin: 15px 0; }}
        ul {{ margin: 15px 0; padding-left: 25px; }}
        li {{ margin: 8px 0; }}
        .footer {{ text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }}
        a {{ color: #667eea; text-decoration: none; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            {body_html}
        </div>
        <div class="footer">
            <p>如不想再收到此类邮件，请<a href="#">点击退订</a></p>
        </div>
    </div>
</body>
</html>
"""

    def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        plain_content: Optional[str] = None,
        tracking_id: Optional[str] = None
    ) -> Dict:
        """
        发送单封邮件

        Args:
            to_email: 收件人邮箱
            to_name: 收件人姓名
            subject: 邮件主题
            html_content: HTML内容
            plain_content: 纯文本内容
            tracking_id: 追踪ID

        Returns:
            发送结果字典
        """
        if not tracking_id:
            tracking_id = self._generate_tracking_id(to_email)

        try:
            # 创建邮件
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email, to_name),
                subject=subject,
                html_content=Content("text/html", html_content)
            )

            # 添加纯文本版本
            if plain_content:
                message.add_content(Content("text/plain", plain_content))

            # 启用追踪
            message.tracking_settings = TrackingSettings()
            message.tracking_settings.click_tracking = ClickTracking(enable=True, enable_text=False)
            message.tracking_settings.open_tracking = OpenTracking(enable=True)

            # 添加自定义追踪参数
            message.custom_args = {"tracking_id": tracking_id}

            # 发送邮件
            response = self.client.send(message)

            # 记录发送结果
            result = {
                "status": "success",
                "tracking_id": tracking_id,
                "to_email": to_email,
                "to_name": to_name,
                "subject": subject,
                "sent_at": datetime.now().isoformat(),
                "status_code": response.status_code
            }

            # 更新追踪数据
            self.tracking_data["emails"][tracking_id] = result
            self.tracking_data["stats"]["sent"] += 1
            self._save_tracking_data()

            logger.info(f"✓ 邮件发送成功: {to_email} (ID: {tracking_id})")
            return result

        except Exception as e:
            error_msg = str(e)
            logger.error(f"✗ 邮件发送失败: {to_email} - {error_msg}")

            result = {
                "status": "failed",
                "tracking_id": tracking_id,
                "to_email": to_email,
                "to_name": to_name,
                "subject": subject,
                "sent_at": datetime.now().isoformat(),
                "error": error_msg
            }

            self.tracking_data["emails"][tracking_id] = result
            self.tracking_data["stats"]["failed"] += 1
            self._save_tracking_data()

            return result

    def send_email_with_retry(self, *args, **kwargs) -> Dict:
        """带重试机制的邮件发送"""
        for attempt in range(self.retry_times):
            result = self.send_email(*args, **kwargs)

            if result["status"] == "success":
                return result

            if attempt < self.retry_times - 1:
                logger.info(f"重试发送 ({attempt + 1}/{self.retry_times})...")
                time.sleep(self.retry_delay)

        return result

    def send_sequence_campaign(
        self,
        recipients: List[Dict],
        days: List[int] = [1, 3, 7, 14]
    ) -> Dict:
        """
        发送多触点序列营销活动

        Args:
            recipients: 收件人列表
            days: 触点序列天数

        Returns:
            活动结果
        """
        logger.info(f"开始多触点序列营销，共 {len(recipients)} 个客户，{len(days)} 个触点")

        results = {
            "total_recipients": len(recipients),
            "total_emails": len(recipients) * len(days),
            "scheduled": [],
            "sent_now": []
        }

        for recipient in recipients:
            email = recipient.get('email')

            for day in days:
                if day == 1:
                    # Day 1 立即发送
                    result = self.send_signal_driven_email(recipient, sequence_day=1)
                    results['sent_now'].append(result)
                else:
                    # 其他天数安排计划任务
                    send_at = datetime.now() + timedelta(days=day)
                    results['scheduled'].append({
                        'email': email,
                        'sequence_day': day,
                        'send_at': send_at.isoformat()
                    })

                    logger.info(f"已安排: {email} - Day {day} - {send_at.strftime('%Y-%m-%d %H:%M')}")

        logger.info(f"序列营销设置完成: {len(results['sent_now'])} 封已发送, {len(results['scheduled'])} 封已安排")
        return results

    def get_ab_test_report(self) -> Dict:
        """获取A/B测试报告"""
        report = {
            "variants": {}
        }

        for variant in ["A", "B"]:
            data = self.ab_test_data['variants'][variant]
            sent = data['sent']

            if sent > 0:
                report['variants'][variant] = {
                    "sent": sent,
                    "opened": data['opened'],
                    "clicked": data['clicked'],
                    "replied": data['replied'],
                    "open_rate": f"{data['opened'] / sent * 100:.2f}%",
                    "click_rate": f"{data['clicked'] / sent * 100:.2f}%",
                    "reply_rate": f"{data['replied'] / sent * 100:.2f}%"
                }
            else:
                report['variants'][variant] = {
                    "sent": 0,
                    "message": "暂无数据"
                }

        # 计算胜者
        if report['variants']['A'].get('sent', 0) > 0 and report['variants']['B'].get('sent', 0) > 0:
            a_reply = self.ab_test_data['variants']['A']['replied'] / self.ab_test_data['variants']['A']['sent']
            b_reply = self.ab_test_data['variants']['B']['replied'] / self.ab_test_data['variants']['B']['sent']

            if a_reply > b_reply:
                report['winner'] = "A"
                report['improvement'] = f"{(a_reply - b_reply) / b_reply * 100:.1f}%"
            elif b_reply > a_reply:
                report['winner'] = "B"
                report['improvement'] = f"{(b_reply - a_reply) / a_reply * 100:.1f}%"
            else:
                report['winner'] = "平局"

        return report

    def send_batch_emails(
        self,
        recipients: List[Dict],
        subject_template: str,
        html_template: str,
        plain_template: Optional[str] = None,
        personalize: bool = True
    ) -> Dict:
        """
        批量发送邮件

        Args:
            recipients: 收件人列表 [{"email": "...", "name": "...", "data": {...}}]
            subject_template: 主题模板 (支持 {name}, {company} 等变量)
            html_template: HTML模板
            plain_template: 纯文本模板
            personalize: 是否个性化

        Returns:
            批量发送结果
        """
        logger.info(f"开始批量发送邮件，共 {len(recipients)} 封")

        results = {
            "total": len(recipients),
            "success": 0,
            "failed": 0,
            "details": []
        }

        for i, recipient in enumerate(recipients, 1):
            # 速率控制
            if i > 1 and i % self.rate_limit == 0:
                logger.info(f"速率控制: 已发送 {i} 封，等待 60 秒...")
                time.sleep(60)

            # 准备邮件数据
            to_email = recipient.get("email")
            to_name = recipient.get("name", "")
            custom_data = recipient.get("data", {})

            # 个性化内容
            if personalize:
                subject = subject_template.format(name=to_name, **custom_data)
                html_content = html_template.format(name=to_name, **custom_data)
                plain_content = plain_template.format(name=to_name, **custom_data) if plain_template else None
            else:
                subject = subject_template
                html_content = html_template
                plain_content = plain_template

            # 发送邮件
            result = self.send_email_with_retry(
                to_email=to_email,
                to_name=to_name,
                subject=subject,
                html_content=html_content,
                plain_content=plain_content
            )

            results["details"].append(result)

            if result["status"] == "success":
                results["success"] += 1
            else:
                results["failed"] += 1

            # 进度显示
            logger.info(f"进度: {i}/{len(recipients)} ({results['success']} 成功, {results['failed']} 失败)")

            # 短暂延迟
            time.sleep(0.5)

        logger.info(f"批量发送完成: {results['success']} 成功, {results['failed']} 失败")
        return results

    def load_recipients_from_excel(self, file_path: str, sheet_name: str = "Sheet1") -> List[Dict]:
        """
        从Excel加载收件人列表

        Excel格式:
        | email | name | company | position | ... |

        Args:
            file_path: Excel文件路径
            sheet_name: 工作表名称

        Returns:
            收件人列表
        """
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)

            recipients = []
            for _, row in df.iterrows():
                recipient = {
                    "email": row.get("email", ""),
                    "name": row.get("name", ""),
                    "data": row.to_dict()
                }

                if recipient["email"]:  # 确保有邮箱
                    recipients.append(recipient)

            logger.info(f"从 {file_path} 加载了 {len(recipients)} 个收件人")
            return recipients

        except Exception as e:
            logger.error(f"加载Excel失败: {e}")
            return []

    def generate_report(self) -> str:
        """生成发送报告"""
        try:
            # 准备报告数据
            report_data = []
            for tracking_id, email_data in self.tracking_data["emails"].items():
                report_data.append({
                    "追踪ID": tracking_id,
                    "收件人邮箱": email_data.get("to_email"),
                    "收件人姓名": email_data.get("to_name"),
                    "邮件主题": email_data.get("subject"),
                    "发送状态": email_data.get("status"),
                    "发送时间": email_data.get("sent_at"),
                    "是否打开": email_data.get("opened", False),
                    "打开时间": email_data.get("opened_at", ""),
                    "是否点击": email_data.get("clicked", False),
                    "点击时间": email_data.get("clicked_at", ""),
                    "错误信息": email_data.get("error", "")
                })

            # 创建DataFrame
            df = pd.DataFrame(report_data)

            # 保存到Excel
            with pd.ExcelWriter(self.report_file, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name="发送详情", index=False)

                # 统计数据
                stats_df = pd.DataFrame([{
                    "总发送数": self.tracking_data["stats"]["sent"],
                    "成功数": self.tracking_data["stats"]["sent"] - self.tracking_data["stats"]["failed"],
                    "失败数": self.tracking_data["stats"]["failed"],
                    "打开数": self.tracking_data["stats"]["opened"],
                    "点击数": self.tracking_data["stats"]["clicked"],
                    "打开率": f"{self.tracking_data['stats']['opened'] / max(self.tracking_data['stats']['sent'], 1) * 100:.2f}%",
                    "点击率": f"{self.tracking_data['stats']['clicked'] / max(self.tracking_data['stats']['sent'], 1) * 100:.2f}%"
                }])
                stats_df.to_excel(writer, sheet_name="统计数据", index=False)

            logger.info(f"报告已生成: {self.report_file}")
            return self.report_file

        except Exception as e:
            logger.error(f"生成报告失败: {e}")
            return ""

    def update_tracking_event(self, tracking_id: str, event_type: str):
        """
        更新追踪事件 (打开/点击/回复)

        Args:
            tracking_id: 追踪ID
            event_type: 事件类型 ('opened', 'clicked', 'replied', 'converted')
        """
        if tracking_id in self.tracking_data["emails"]:
            email_data = self.tracking_data["emails"][tracking_id]
            email_data[event_type] = True
            email_data[f"{event_type}_at"] = datetime.now().isoformat()
            self.tracking_data["stats"][event_type] += 1

            # 更新A/B测试数据
            ab_variant = email_data.get('ab_variant')
            if ab_variant and event_type in ['opened', 'clicked', 'replied']:
                self.ab_test_data['variants'][ab_variant][event_type] += 1
                self._save_ab_test_data()

            self._save_tracking_data()
            logger.info(f"追踪事件更新: {tracking_id} - {event_type}")


def create_study_abroad_template(sequence_day: int = 1) -> str:
    """创建留学行业邮件模板"""

    templates = {
        1: """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .content {{ background: #ffffff; padding: 30px; }}
        .highlight {{ background: #fff3cd; padding: 2px 6px; border-radius: 3px; }}
        .cta {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        ul {{ margin: 15px 0; padding-left: 25px; }}
        li {{ margin: 8px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <p>Hi {name}，</p>

            <p>注意到您最近在<span class="highlight">{source}</span>搜索<strong>{country}{degree}</strong>相关信息。</p>

            <p>作为帮助过300+学生的顾问，我发现大部分申请者都会在这3个地方踩坑:</p>
            <ul>
                <li><strong>时间规划太晚</strong> - 错过最佳申请期，只能申请排名靠后的学校</li>
                <li><strong>选校定位不准</strong> - 浪费申请费，拿不到理想offer</li>
                <li><strong>文书千篇一律</strong> - 无法打动招生官，被秒拒</li>
            </ul>

            <p>我们刚帮一位GPA 3.3的学生拿到了<strong>UCL的offer</strong>，关键就在于提前6个月开始规划。</p>

            <p>回复"是"获取免费的<strong>{country}{major}申请时间规划表</strong>?</p>

            <p>祝好，<br>留学顾问团队</p>
        </div>
    </div>
</body>
</html>
""",
        3: """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .content {{ background: #ffffff; padding: 30px; }}
        .case-box {{ background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }}
        .cta {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <p>Hi {name}，</p>

            <p>上次给您发的规划表不知道有没有帮到您?</p>

            <p>今天想分享一个真实案例:</p>

            <div class="case-box">
                <strong>学生背景:</strong> 小李，985院校，GPA 3.5，托福105<br>
                <strong>申请目标:</strong> {country}{degree} - {major}<br>
                <strong>准备时间:</strong> 3个月<br>
                <strong>最终结果:</strong> 拿到3所Top30学校offer (UCL, KCL, 爱丁堡)
            </div>

            <p>关键成功因素:</p>
            <ul>
                <li>提前规划，避开申请高峰期</li>
                <li>精准选校，冲刺+稳妥+保底组合</li>
                <li>个性化文书，突出独特经历</li>
            </ul>

            <p>我整理了他的完整申请时间线和经验，可以发给您参考。</p>

            <a href="#" class="cta">点击下载案例分析PDF</a>

            <p>祝好，<br>留学顾问团队</p>
        </div>
    </div>
</body>
</html>
""",
        7: """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .content {{ background: #ffffff; padding: 30px; }}
        .urgent {{ background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }}
        .cta {{ display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <p>Hi {name}，</p>

            <div class="urgent">
                ⏰ <strong>重要提醒:</strong> {country}{degree}申请季马上开始，现在准备刚刚好!
            </div>

            <p>本月我们只剩<strong>3个免费评估名额</strong>，已经有12位同学预约了。</p>

            <p><strong>15分钟电话</strong>，我们会:</p>
            <ul>
                <li>✓ 分析您的背景和竞争力</li>
                <li>✓ 推荐3-5所匹配的学校</li>
                <li>✓ 给出具体的准备建议</li>
                <li>✓ 解答您的所有疑问</li>
            </ul>

            <p>不推销，只分析。承诺!</p>

            <a href="#" class="cta">点击预约本周时间</a>

            <p>祝好，<br>留学顾问团队</p>
        </div>
    </div>
</body>
</html>
""",
        14: """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .content {{ background: #ffffff; padding: 30px; }}
        .gift-box {{ background: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <p>Hi {name}，</p>

            <p>这是我最后一次给您发邮件。</p>

            <p>看到很多同学已经开始准备申请了，不想您错过最佳时机。</p>

            <div class="gift-box">
                <strong>🎁 告别礼物</strong><br><br>
                我整理了一份<strong>"{country}留学避坑指南"</strong>，包含:
                <ul>
                    <li>申请时间规划表</li>
                    <li>选校定位方法</li>
                    <li>文书写作技巧</li>
                    <li>常见问题解答</li>
                </ul>
            </div>

            <p>回复"需要"我就发给您。</p>

            <p>如果将来有需要，随时联系我。</p>

            <p>祝一切顺利，<br>留学顾问团队</p>
        </div>
    </div>
</body>
</html>
"""
    }

    return templates.get(sequence_day, templates[1])


# 使用示例
if __name__ == "__main__":
    # 配置参数
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "your-sendgrid-api-key")
    FROM_EMAIL = os.getenv("FROM_EMAIL", "advisor@studyabroad.com")
    FROM_NAME = "留学顾问团队"
    DEEPSEEK_API_KEY = "sk-d86589fb80f248cea3f4a843eaebce5a"

    # 创建发送器
    sender = EmailAutoSender(
        api_key=SENDGRID_API_KEY,
        from_email=FROM_EMAIL,
        from_name=FROM_NAME,
        deepseek_api_key=DEEPSEEK_API_KEY
    )

    # 示例: 单个客户的信号驱动邮件
    print("\n=== 示例1: 发送信号驱动邮件 ===")
    lead = {
        "name": "张同学",
        "email": "zhang@example.com",
        "target_country": "英国",
        "target_degree": "硕士",
        "major": "计算机科学",
        "budget": "30-50万",
        "source": "小红书搜索"
    }

    result = sender.send_signal_driven_email(lead, sequence_day=1)
    print(f"发送结果: {result['status']}")

    # 示例: 多触点序列营销
    print("\n=== 示例2: 多触点序列营销 ===")
    recipients = [
        {
            "name": "李同学",
            "email": "li@example.com",
            "target_country": "美国",
            "target_degree": "本科",
            "major": "商业管理",
            "budget": "50-80万",
            "source": "知乎问答"
        },
        {
            "name": "王同学",
            "email": "wang@example.com",
            "target_country": "加拿大",
            "target_degree": "硕士",
            "major": "数据科学",
            "budget": "30-50万",
            "source": "朋友推荐"
        }
    ]

    campaign_result = sender.send_sequence_campaign(recipients, days=[1, 3, 7, 14])
    print(f"已发送: {len(campaign_result['sent_now'])} 封")
    print(f"已安排: {len(campaign_result['scheduled'])} 封")

    # 示例: 查看A/B测试报告
    print("\n=== 示例3: A/B测试报告 ===")
    ab_report = sender.get_ab_test_report()
    print(json.dumps(ab_report, ensure_ascii=False, indent=2))

    # 生成报告
    print("\n=== 生成发送报告 ===")
    report_file = sender.generate_report()
    print(f"报告已保存: {report_file}")

