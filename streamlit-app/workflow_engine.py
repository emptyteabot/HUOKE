"""
自动化工作流引擎

支持的触发器:
1. 邮件未打开 N 天
2. 邮件已打开但未点击 N 天
3. 邮件已点击但未回复 N 天
4. 新线索添加
5. 线索互动分数达到阈值

支持的动作:
1. 发送跟进邮件
2. 更新线索状态
3. 添加标签
4. 发送通知
5. 修改线索分数
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
import json

class WorkflowEngine:
    """工作流引擎"""

    def __init__(self, supabase_client):
        self.supabase = supabase_client

    def create_workflow(self, workflow_data: Dict) -> str:
        """
        创建工作流

        Args:
            workflow_data: {
                'user_id': str,
                'name': str,
                'trigger_type': str,
                'trigger_conditions': dict,
                'actions': list,
                'enabled': bool
            }

        Returns:
            str: 工作流ID
        """
        try:
            workflow_data['created_at'] = datetime.now().isoformat()
            result = self.supabase.table('workflows').insert(workflow_data).execute()
            return result.data[0]['id']
        except Exception as e:
            print(f"创建工作流失败: {e}")
            raise

    def get_workflows(self, user_id: str, enabled_only: bool = False) -> List[Dict]:
        """获取工作流列表"""
        try:
            query = self.supabase.table('workflows').select('*').eq('user_id', user_id)

            if enabled_only:
                query = query.eq('enabled', True)

            result = query.order('created_at', desc=True).execute()
            return result.data
        except Exception as e:
            print(f"获取工作流失败: {e}")
            return []

    def update_workflow(self, workflow_id: str, updates: Dict) -> bool:
        """更新工作流"""
        try:
            self.supabase.table('workflows').update(updates).eq('id', workflow_id).execute()
            return True
        except Exception as e:
            print(f"更新工作流失败: {e}")
            return False

    def delete_workflow(self, workflow_id: str) -> bool:
        """删除工作流"""
        try:
            self.supabase.table('workflows').delete().eq('id', workflow_id).execute()
            return True
        except Exception as e:
            print(f"删除工作流失败: {e}")
            return False

    def check_and_execute_workflows(self, user_id: str) -> Dict:
        """
        检查并执行所有启用的工作流

        Returns:
            Dict: {
                'checked': int,
                'triggered': int,
                'executed': int,
                'failed': int,
                'results': List[Dict]
            }
        """
        workflows = self.get_workflows(user_id, enabled_only=True)

        results = {
            'checked': len(workflows),
            'triggered': 0,
            'executed': 0,
            'failed': 0,
            'results': []
        }

        for workflow in workflows:
            try:
                # 检查触发条件
                triggered_items = self._check_trigger(workflow, user_id)

                if triggered_items:
                    results['triggered'] += len(triggered_items)

                    # 执行动作
                    for item in triggered_items:
                        success = self._execute_actions(workflow, item, user_id)
                        if success:
                            results['executed'] += 1
                        else:
                            results['failed'] += 1

                        results['results'].append({
                            'workflow_id': workflow['id'],
                            'workflow_name': workflow['name'],
                            'item': item,
                            'success': success
                        })

            except Exception as e:
                print(f"执行工作流失败: {e}")
                results['failed'] += 1

        return results

    def _check_trigger(self, workflow: Dict, user_id: str) -> List[Dict]:
        """检查触发条件"""
        trigger_type = workflow['trigger_type']
        conditions = workflow['trigger_conditions']

        if trigger_type == 'email_not_opened':
            return self._check_email_not_opened(user_id, conditions)
        elif trigger_type == 'email_opened_not_clicked':
            return self._check_email_opened_not_clicked(user_id, conditions)
        elif trigger_type == 'email_clicked_no_reply':
            return self._check_email_clicked_no_reply(user_id, conditions)
        elif trigger_type == 'new_lead':
            return self._check_new_lead(user_id, conditions)
        elif trigger_type == 'engagement_score':
            return self._check_engagement_score(user_id, conditions)
        else:
            return []

    def _check_email_not_opened(self, user_id: str, conditions: Dict) -> List[Dict]:
        """检查未打开的邮件"""
        days = conditions.get('days', 3)
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()

        try:
            result = self.supabase.table('emails').select('*, leads(*)').eq('user_id', user_id).eq('status', 'sent').is_('opened_at', 'null').lt('sent_at', cutoff_date).execute()

            return result.data
        except Exception as e:
            print(f"检查未打开邮件失败: {e}")
            return []

    def _check_email_opened_not_clicked(self, user_id: str, conditions: Dict) -> List[Dict]:
        """检查已打开但未点击的邮件"""
        days = conditions.get('days', 5)
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()

        try:
            result = self.supabase.table('emails').select('*, leads(*)').eq('user_id', user_id).not_.is_('opened_at', 'null').is_('clicked_at', 'null').lt('opened_at', cutoff_date).execute()

            return result.data
        except Exception as e:
            print(f"检查已打开未点击邮件失败: {e}")
            return []

    def _check_email_clicked_no_reply(self, user_id: str, conditions: Dict) -> List[Dict]:
        """检查已点击但未回复的邮件"""
        days = conditions.get('days', 7)
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()

        try:
            result = self.supabase.table('emails').select('*, leads(*)').eq('user_id', user_id).not_.is_('clicked_at', 'null').lt('clicked_at', cutoff_date).execute()

            # 过滤掉已经有后续邮件的
            filtered = []
            for email in result.data:
                lead_id = email['lead_id']
                # 检查是否有更新的邮件
                newer_emails = self.supabase.table('emails').select('id').eq('lead_id', lead_id).gt('created_at', email['clicked_at']).execute()

                if not newer_emails.data:
                    filtered.append(email)

            return filtered
        except Exception as e:
            print(f"检查已点击未回复邮件失败: {e}")
            return []

    def _check_new_lead(self, user_id: str, conditions: Dict) -> List[Dict]:
        """检查新线索"""
        hours = conditions.get('hours', 1)
        cutoff_date = (datetime.now() - timedelta(hours=hours)).isoformat()

        try:
            result = self.supabase.table('leads').select('*').eq('user_id', user_id).gt('created_at', cutoff_date).execute()

            return result.data
        except Exception as e:
            print(f"检查新线索失败: {e}")
            return []

    def _check_engagement_score(self, user_id: str, conditions: Dict) -> List[Dict]:
        """检查互动分数"""
        threshold = conditions.get('threshold', 70)
        operator = conditions.get('operator', 'gte')  # gte, lte, eq

        try:
            from email_tracking import get_email_engagement_score

            # 获取所有邮件
            emails = self.supabase.table('emails').select('*, leads(*)').eq('user_id', user_id).execute().data

            # 计算分数并过滤
            filtered = []
            for email in emails:
                score_data = get_email_engagement_score(email)
                score = score_data['score']

                if operator == 'gte' and score >= threshold:
                    filtered.append(email)
                elif operator == 'lte' and score <= threshold:
                    filtered.append(email)
                elif operator == 'eq' and score == threshold:
                    filtered.append(email)

            return filtered
        except Exception as e:
            print(f"检查互动分数失败: {e}")
            return []

    def _execute_actions(self, workflow: Dict, item: Dict, user_id: str) -> bool:
        """执行动作"""
        actions = workflow['actions']

        try:
            for action in actions:
                action_type = action['type']

                if action_type == 'send_email':
                    self._action_send_email(item, action, user_id)
                elif action_type == 'update_lead_status':
                    self._action_update_lead_status(item, action)
                elif action_type == 'add_tag':
                    self._action_add_tag(item, action)
                elif action_type == 'send_notification':
                    self._action_send_notification(item, action, user_id)
                elif action_type == 'update_score':
                    self._action_update_score(item, action)

            return True
        except Exception as e:
            print(f"执行动作失败: {e}")
            return False

    def _action_send_email(self, item: Dict, action: Dict, user_id: str):
        """动作: 发送邮件"""
        from email_sender import send_email, format_email_html
        from database import save_sent_email

        lead = item.get('leads', item)  # 可能是email对象或lead对象

        if not lead.get('email'):
            return

        # 获取邮件模板
        template_id = action.get('template_id')
        subject = action.get('subject', '跟进邮件')
        body = action.get('body', '您好,这是一封自动跟进邮件。')

        # 替换变量
        variables = {
            'name': lead.get('name', ''),
            'target_country': lead.get('target_country', ''),
            'target_degree': lead.get('target_degree', ''),
            'major': lead.get('major', '')
        }

        subject = subject.format(**variables)
        body = body.format(**variables)

        # 发送邮件
        html_body = format_email_html(body, action.get('institution_name', 'GuestSeek'))

        result = send_email(
            to_email=lead['email'],
            to_name=lead['name'],
            subject=subject,
            body=html_body,
            from_name=action.get('from_name', 'GuestSeek')
        )

        if result['success']:
            # 保存记录
            save_sent_email({
                'user_id': user_id,
                'lead_id': lead['id'],
                'subject': subject,
                'body': body
            }, result['message_id'])

    def _action_update_lead_status(self, item: Dict, action: Dict):
        """动作: 更新线索状态"""
        lead = item.get('leads', item)
        new_status = action.get('status', 'follow_up')

        self.supabase.table('leads').update({'status': new_status}).eq('id', lead['id']).execute()

    def _action_add_tag(self, item: Dict, action: Dict):
        """动作: 添加标签"""
        lead = item.get('leads', item)
        tag = action.get('tag', '')

        # 获取现有标签
        lead_data = self.supabase.table('leads').select('tags').eq('id', lead['id']).execute().data[0]
        tags = lead_data.get('tags', [])

        if isinstance(tags, list):
            if tag not in tags:
                tags.append(tag)
        else:
            tags = [tag]

        self.supabase.table('leads').update({'tags': tags}).eq('id', lead['id']).execute()

    def _action_send_notification(self, item: Dict, action: Dict, user_id: str):
        """动作: 发送通知"""
        # 记录到活动日志
        lead = item.get('leads', item)
        message = action.get('message', '工作流触发通知')

        self.supabase.table('activity_logs').insert({
            'user_id': user_id,
            'lead_id': lead.get('id'),
            'action': 'workflow_notification',
            'details': {'message': message},
            'created_at': datetime.now().isoformat()
        }).execute()

    def _action_update_score(self, item: Dict, action: Dict):
        """动作: 更新分数"""
        lead = item.get('leads', item)
        score_change = action.get('score_change', 0)

        # 获取当前分数
        lead_data = self.supabase.table('leads').select('score').eq('id', lead['id']).execute().data[0]
        current_score = lead_data.get('score', 0)
        new_score = max(0, min(100, current_score + score_change))

        self.supabase.table('leads').update({'score': new_score}).eq('id', lead['id']).execute()


# 预定义工作流模板
WORKFLOW_TEMPLATES = {
    '3天未打开自动跟进': {
        'name': '3天未打开自动跟进',
        'trigger_type': 'email_not_opened',
        'trigger_conditions': {'days': 3},
        'actions': [
            {
                'type': 'send_email',
                'subject': '【{institution_name}】{name},还在考虑留学吗?',
                'body': '''尊敬的{name}家长,您好!

几天前我给您发送了留学规划方案,不知道您是否收到?

如果您有任何疑问,欢迎随时联系我!

期待您的回复!''',
                'from_name': 'XX留学',
                'institution_name': 'XX留学'
            },
            {
                'type': 'update_lead_status',
                'status': 'follow_up'
            }
        ],
        'enabled': True
    },
    '7天未点击发送优惠': {
        'name': '7天未点击发送优惠',
        'trigger_type': 'email_opened_not_clicked',
        'trigger_conditions': {'days': 7},
        'actions': [
            {
                'type': 'send_email',
                'subject': '【限时优惠】{name}专属留学优惠来了!',
                'body': '''尊敬的{name}家长,您好!

感谢您对我们的关注!

现在报名可享受:
• 免费背景提升规划
• 8折服务费优惠
• 赠送语言培训课程

优惠仅限本周,名额有限!

立即联系我了解详情!''',
                'from_name': 'XX留学',
                'institution_name': 'XX留学'
            },
            {
                'type': 'add_tag',
                'tag': '已发送优惠'
            }
        ],
        'enabled': True
    },
    '高意向客户提醒': {
        'name': '高意向客户提醒',
        'trigger_type': 'engagement_score',
        'trigger_conditions': {'threshold': 70, 'operator': 'gte'},
        'actions': [
            {
                'type': 'send_notification',
                'message': '发现高意向客户,请及时跟进!'
            },
            {
                'type': 'update_lead_status',
                'status': 'high_intent'
            },
            {
                'type': 'update_score',
                'score_change': 10
            }
        ],
        'enabled': True
    },
    '新线索自动欢迎': {
        'name': '新线索自动欢迎',
        'trigger_type': 'new_lead',
        'trigger_conditions': {'hours': 1},
        'actions': [
            {
                'type': 'send_email',
                'subject': '欢迎咨询{institution_name}!',
                'body': '''尊敬的{name}家长,您好!

感谢您对{institution_name}的关注!

我是您的专属留学顾问,很高兴为您服务。

我们将为您提供:
• 免费留学评估
• 个性化方案定制
• 全程申请指导

期待与您进一步沟通!''',
                'from_name': 'XX留学',
                'institution_name': 'XX留学'
            },
            {
                'type': 'add_tag',
                'tag': '新客户'
            }
        ],
        'enabled': True
    }
}
