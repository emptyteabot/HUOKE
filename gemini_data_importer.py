"""
Gemini数据导入工具
将Gemini Deep Research收集的客户数据导入LeadPulse系统

支持格式:
- JSON (推荐)
- CSV
- Excel

使用方法:
python gemini_data_importer.py --input gemini_leads.json --output leadpulse_leads.json
"""

import json
import csv
import pandas as pd
import sys
from datetime import datetime
from typing import List, Dict, Optional
import re


class GeminiDataImporter:
    """Gemini数据导入器"""

    def __init__(self):
        self.imported_count = 0
        self.skipped_count = 0
        self.errors = []

    def import_from_json(self, file_path: str) -> List[Dict]:
        """
        从JSON文件导入数据

        Args:
            file_path: JSON文件路径

        Returns:
            标准化的客户数据列表
        """
        print(f"📂 正在读取: {file_path}")

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                raw_data = json.load(f)

            # 支持多种JSON格式
            if isinstance(raw_data, list):
                leads = raw_data
            elif isinstance(raw_data, dict):
                # 可能是 {"leads": [...]} 格式
                leads = raw_data.get('leads', [raw_data])
            else:
                raise ValueError("不支持的JSON格式")

            print(f"✓ 读取到 {len(leads)} 条原始数据")

            # 标准化数据
            standardized_leads = []
            for idx, lead in enumerate(leads, 1):
                try:
                    standardized = self._standardize_lead(lead)
                    if standardized:
                        standardized_leads.append(standardized)
                        self.imported_count += 1
                    else:
                        self.skipped_count += 1
                except Exception as e:
                    self.errors.append(f"第{idx}条数据错误: {str(e)}")
                    self.skipped_count += 1

            print(f"✓ 成功导入: {self.imported_count} 条")
            print(f"⚠ 跳过: {self.skipped_count} 条")

            return standardized_leads

        except FileNotFoundError:
            print(f"❌ 文件不存在: {file_path}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ JSON格式错误: {e}")
            sys.exit(1)

    def import_from_csv(self, file_path: str) -> List[Dict]:
        """
        从CSV文件导入数据

        Args:
            file_path: CSV文件路径

        Returns:
            标准化的客户数据列表
        """
        print(f"📂 正在读取: {file_path}")

        try:
            df = pd.read_csv(file_path, encoding='utf-8')
            print(f"✓ 读取到 {len(df)} 条原始数据")

            standardized_leads = []
            for idx, row in df.iterrows():
                try:
                    lead = row.to_dict()
                    standardized = self._standardize_lead(lead)
                    if standardized:
                        standardized_leads.append(standardized)
                        self.imported_count += 1
                    else:
                        self.skipped_count += 1
                except Exception as e:
                    self.errors.append(f"第{idx+1}行错误: {str(e)}")
                    self.skipped_count += 1

            print(f"✓ 成功导入: {self.imported_count} 条")
            print(f"⚠ 跳过: {self.skipped_count} 条")

            return standardized_leads

        except FileNotFoundError:
            print(f"❌ 文件不存在: {file_path}")
            sys.exit(1)
        except Exception as e:
            print(f"❌ 读取CSV失败: {e}")
            sys.exit(1)

    def import_from_excel(self, file_path: str, sheet_name: str = None) -> List[Dict]:
        """
        从Excel文件导入数据

        Args:
            file_path: Excel文件路径
            sheet_name: 工作表名称(默认读取第一个)

        Returns:
            标准化的客户数据列表
        """
        print(f"📂 正在读取: {file_path}")

        try:
            if sheet_name:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
            else:
                df = pd.read_excel(file_path)

            print(f"✓ 读取到 {len(df)} 条原始数据")

            standardized_leads = []
            for idx, row in df.iterrows():
                try:
                    lead = row.to_dict()
                    standardized = self._standardize_lead(lead)
                    if standardized:
                        standardized_leads.append(standardized)
                        self.imported_count += 1
                    else:
                        self.skipped_count += 1
                except Exception as e:
                    self.errors.append(f"第{idx+1}行错误: {str(e)}")
                    self.skipped_count += 1

            print(f"✓ 成功导入: {self.imported_count} 条")
            print(f"⚠ 跳过: {self.skipped_count} 条")

            return standardized_leads

        except FileNotFoundError:
            print(f"❌ 文件不存在: {file_path}")
            sys.exit(1)
        except Exception as e:
            print(f"❌ 读取Excel失败: {e}")
            sys.exit(1)

    def _standardize_lead(self, raw_lead: Dict) -> Optional[Dict]:
        """
        标准化客户数据为LeadPulse格式

        Args:
            raw_lead: 原始数据(Gemini返回的格式)

        Returns:
            标准化后的数据,如果数据无效则返回None
        """
        # 提取联系方式
        contact = self._extract_contact(raw_lead)
        if not contact.get('email') and not contact.get('wechat') and not contact.get('phone'):
            # 没有任何联系方式,跳过
            return None

        # 提取背景信息
        background = self._extract_background(raw_lead)

        # 提取目标信息
        target = self._extract_target(raw_lead)

        # 提取意向信息
        intent = self._extract_intent(raw_lead)

        # 提取触达计划
        outreach = self._extract_outreach(raw_lead)

        # 生成标准化数据
        standardized = {
            # 基本信息
            'name': self._get_field(raw_lead, ['name', 'weibo_name', 'username', '姓名', '用户名']),
            'email': contact.get('email'),
            'phone': contact.get('phone'),
            'wechat': contact.get('wechat'),
            'qq': contact.get('qq'),

            # 背景信息
            'school': background.get('school'),
            'major': background.get('major'),
            'gpa': background.get('gpa'),
            'grade': background.get('grade'),

            # 目标信息
            'target_country': target.get('country'),
            'target_university': target.get('university'),
            'target_major': target.get('major'),
            'target_degree': target.get('degree'),

            # 预算和时间线
            'budget': self._get_field(raw_lead, ['budget', '预算']),
            'timeline': self._get_field(raw_lead, ['timeline', 'application_timeline', '时间线']),

            # 意向信息
            'intent_score': intent.get('score', 5),
            'priority': intent.get('priority', 'B'),
            'pain_points': intent.get('pain_points', []),
            'signals': intent.get('signals', []),

            # 来源信息
            'source': self._get_field(raw_lead, ['source', 'platform', '来源']),
            'source_url': self._get_field(raw_lead, ['source_url', 'profile_url', 'url', '链接']),
            'collected_at': datetime.now().isoformat(),

            # 触达计划
            'outreach_channel': outreach.get('channel'),
            'outreach_timing': outreach.get('timing'),
            'outreach_message': outreach.get('message'),
            'value_hook': outreach.get('hook'),

            # 备注
            'notes': self._get_field(raw_lead, ['notes', 'remarks', 'bio', '备注']),

            # 原始数据(用于调试)
            'raw_data': raw_lead
        }

        return standardized

    def _extract_contact(self, raw_lead: Dict) -> Dict:
        """提取联系方式"""
        contact = {}

        # 尝试从多个可能的字段提取
        if 'contact' in raw_lead and isinstance(raw_lead['contact'], dict):
            contact = raw_lead['contact']
        else:
            # 邮箱
            email = self._get_field(raw_lead, ['email', 'mail', '邮箱', 'contact'])
            if email and self._is_valid_email(email):
                contact['email'] = email

            # 微信
            wechat = self._get_field(raw_lead, ['wechat', 'weixin', '微信', 'wx'])
            if wechat:
                contact['wechat'] = wechat

            # 手机号
            phone = self._get_field(raw_lead, ['phone', 'mobile', 'tel', '手机', '电话'])
            if phone and self._is_valid_phone(phone):
                contact['phone'] = phone

            # QQ
            qq = self._get_field(raw_lead, ['qq', 'QQ'])
            if qq:
                contact['qq'] = qq

        return contact

    def _extract_background(self, raw_lead: Dict) -> Dict:
        """提取背景信息"""
        background = {}

        if 'background' in raw_lead and isinstance(raw_lead['background'], dict):
            background = raw_lead['background']
        else:
            background['school'] = self._get_field(raw_lead, ['school', 'university', '学校', '本科'])
            background['major'] = self._get_field(raw_lead, ['major', 'discipline', '专业'])
            background['gpa'] = self._get_field(raw_lead, ['gpa', 'GPA', '绩点'])
            background['grade'] = self._get_field(raw_lead, ['grade', 'year', '年级'])

        return background

    def _extract_target(self, raw_lead: Dict) -> Dict:
        """提取目标信息"""
        target = {}

        if 'target' in raw_lead and isinstance(raw_lead['target'], dict):
            target = raw_lead['target']
        else:
            target['country'] = self._get_field(raw_lead, ['target_country', 'country', '目标国家'])
            target['university'] = self._get_field(raw_lead, ['target_university', 'target_school', '目标学校'])
            target['major'] = self._get_field(raw_lead, ['target_major', '目标专业'])
            target['degree'] = self._get_field(raw_lead, ['target_degree', 'degree', '学位'])

        return target

    def _extract_intent(self, raw_lead: Dict) -> Dict:
        """提取意向信息"""
        intent = {}

        intent['score'] = self._get_field(raw_lead, ['intent_score', 'score', '意向评分'], default=5)
        intent['priority'] = self._get_field(raw_lead, ['priority', '优先级'], default='B')

        # 痛点
        pain_points = self._get_field(raw_lead, ['pain_points', 'pains', '痛点'])
        if isinstance(pain_points, list):
            intent['pain_points'] = pain_points
        elif isinstance(pain_points, str):
            intent['pain_points'] = [pain_points]
        else:
            intent['pain_points'] = []

        # 信号
        signals = self._get_field(raw_lead, ['signals', 'intent_signals', '行为信号'])
        if isinstance(signals, list):
            intent['signals'] = signals
        elif isinstance(signals, str):
            intent['signals'] = [signals]
        else:
            intent['signals'] = []

        return intent

    def _extract_outreach(self, raw_lead: Dict) -> Dict:
        """提取触达计划"""
        outreach = {}

        if 'outreach_plan' in raw_lead and isinstance(raw_lead['outreach_plan'], dict):
            plan = raw_lead['outreach_plan']
            outreach['channel'] = plan.get('channel')
            outreach['timing'] = plan.get('timing')
            outreach['message'] = plan.get('message')
            outreach['hook'] = plan.get('hook')
        else:
            outreach['channel'] = self._get_field(raw_lead, ['outreach_channel', 'channel', '触达渠道'])
            outreach['timing'] = self._get_field(raw_lead, ['outreach_timing', 'best_contact_time', '最佳时间'])
            outreach['message'] = self._get_field(raw_lead, ['outreach_message', 'approach', '开场白'])
            outreach['hook'] = self._get_field(raw_lead, ['value_hook', 'hook', '价值钩子'])

        return outreach

    def _get_field(self, data: Dict, possible_keys: List[str], default=None):
        """从多个可能的键中获取值"""
        for key in possible_keys:
            if key in data and data[key] not in [None, '', 'nan', 'NaN']:
                return data[key]
        return default

    def _is_valid_email(self, email: str) -> bool:
        """验证邮箱格式"""
        if not email or not isinstance(email, str):
            return False
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    def _is_valid_phone(self, phone: str) -> bool:
        """验证手机号格式"""
        if not phone or not isinstance(phone, str):
            return False
        # 中国手机号: 1开头,11位数字
        pattern = r'^1[3-9]\d{9}$'
        phone_clean = re.sub(r'[^\d]', '', phone)
        return bool(re.match(pattern, phone_clean))

    def export_to_json(self, leads: List[Dict], output_path: str):
        """导出为JSON格式"""
        print(f"\n💾 正在导出到: {output_path}")

        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(leads, f, ensure_ascii=False, indent=2)

            print(f"✓ 成功导出 {len(leads)} 条数据")

        except Exception as e:
            print(f"❌ 导出失败: {e}")
            sys.exit(1)

    def export_to_csv(self, leads: List[Dict], output_path: str):
        """导出为CSV格式"""
        print(f"\n💾 正在导出到: {output_path}")

        try:
            if not leads:
                print("⚠ 没有数据可导出")
                return

            # 展平嵌套字段
            flattened_leads = []
            for lead in leads:
                flat = {
                    'name': lead.get('name'),
                    'email': lead.get('email'),
                    'phone': lead.get('phone'),
                    'wechat': lead.get('wechat'),
                    'qq': lead.get('qq'),
                    'school': lead.get('school'),
                    'major': lead.get('major'),
                    'gpa': lead.get('gpa'),
                    'grade': lead.get('grade'),
                    'target_country': lead.get('target_country'),
                    'target_university': lead.get('target_university'),
                    'target_major': lead.get('target_major'),
                    'target_degree': lead.get('target_degree'),
                    'budget': lead.get('budget'),
                    'timeline': lead.get('timeline'),
                    'intent_score': lead.get('intent_score'),
                    'priority': lead.get('priority'),
                    'pain_points': ', '.join(lead.get('pain_points', [])),
                    'signals': ', '.join(lead.get('signals', [])),
                    'source': lead.get('source'),
                    'source_url': lead.get('source_url'),
                    'outreach_channel': lead.get('outreach_channel'),
                    'outreach_timing': lead.get('outreach_timing'),
                    'outreach_message': lead.get('outreach_message'),
                    'value_hook': lead.get('value_hook'),
                    'notes': lead.get('notes'),
                }
                flattened_leads.append(flat)

            df = pd.DataFrame(flattened_leads)
            df.to_csv(output_path, index=False, encoding='utf-8-sig')

            print(f"✓ 成功导出 {len(leads)} 条数据")

        except Exception as e:
            print(f"❌ 导出失败: {e}")
            sys.exit(1)

    def export_to_excel(self, leads: List[Dict], output_path: str):
        """导出为Excel格式(按优先级分Sheet)"""
        print(f"\n💾 正在导出到: {output_path}")

        try:
            if not leads:
                print("⚠ 没有数据可导出")
                return

            # 按优先级分组
            s_leads = [l for l in leads if l.get('priority') == 'S']
            a_leads = [l for l in leads if l.get('priority') == 'A']
            b_leads = [l for l in leads if l.get('priority') == 'B']
            other_leads = [l for l in leads if l.get('priority') not in ['S', 'A', 'B']]

            with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                if s_leads:
                    df_s = pd.DataFrame(s_leads)
                    df_s.to_excel(writer, sheet_name='S级客户(立即联系)', index=False)

                if a_leads:
                    df_a = pd.DataFrame(a_leads)
                    df_a.to_excel(writer, sheet_name='A级客户(3天内)', index=False)

                if b_leads:
                    df_b = pd.DataFrame(b_leads)
                    df_b.to_excel(writer, sheet_name='B级客户(1周内)', index=False)

                if other_leads:
                    df_other = pd.DataFrame(other_leads)
                    df_other.to_excel(writer, sheet_name='其他客户', index=False)

            print(f"✓ 成功导出 {len(leads)} 条数据")
            print(f"  - S级: {len(s_leads)} 条")
            print(f"  - A级: {len(a_leads)} 条")
            print(f"  - B级: {len(b_leads)} 条")
            print(f"  - 其他: {len(other_leads)} 条")

        except Exception as e:
            print(f"❌ 导出失败: {e}")
            sys.exit(1)

    def print_summary(self):
        """打印导入摘要"""
        print("\n" + "="*50)
        print("📊 导入摘要")
        print("="*50)
        print(f"✓ 成功导入: {self.imported_count} 条")
        print(f"⚠ 跳过: {self.skipped_count} 条")

        if self.errors:
            print(f"\n❌ 错误列表 ({len(self.errors)}个):")
            for error in self.errors[:10]:  # 只显示前10个错误
                print(f"  - {error}")
            if len(self.errors) > 10:
                print(f"  ... 还有 {len(self.errors) - 10} 个错误")


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description='Gemini数据导入工具')
    parser.add_argument('--input', '-i', required=True, help='输入文件路径')
    parser.add_argument('--output', '-o', required=True, help='输出文件路径')
    parser.add_argument('--format', '-f', choices=['json', 'csv', 'excel'], default='json',
                        help='输出格式(默认: json)')
    parser.add_argument('--sheet', '-s', help='Excel工作表名称(仅用于输入Excel时)')

    args = parser.parse_args()

    # 初始化导入器
    importer = GeminiDataImporter()

    # 根据输入文件类型导入
    input_file = args.input.lower()
    if input_file.endswith('.json'):
        leads = importer.import_from_json(args.input)
    elif input_file.endswith('.csv'):
        leads = importer.import_from_csv(args.input)
    elif input_file.endswith(('.xlsx', '.xls')):
        leads = importer.import_from_excel(args.input, args.sheet)
    else:
        print("❌ 不支持的文件格式,请使用 .json, .csv 或 .xlsx")
        sys.exit(1)

    # 导出数据
    if args.format == 'json':
        importer.export_to_json(leads, args.output)
    elif args.format == 'csv':
        importer.export_to_csv(leads, args.output)
    elif args.format == 'excel':
        importer.export_to_excel(leads, args.output)

    # 打印摘要
    importer.print_summary()

    print("\n✅ 完成!数据已准备好导入LeadPulse系统")
    print(f"📁 输出文件: {args.output}")


if __name__ == '__main__':
    main()
