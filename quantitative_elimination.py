"""
量化淘汰机制 - Quantitative Elimination System
2026年顶级获客策略核心模块

功能:
1. 并行跑5-10个不同策略
2. 追踪核心指标:送达率、打开率、回复率、MQL到SQL转化率
3. 止损线:200次触达后回复率<2%立即封存
4. 只保留正期望收益的策略
"""

import time
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
import pandas as pd
import random


@dataclass
class Strategy:
    """策略"""
    strategy_id: str
    strategy_name: str
    template_type: str  # 话术模板类型
    channel: str  # 触达渠道
    subject_variant: str  # 主题行变体
    created_at: datetime
    status: str  # active, paused, archived

    def to_dict(self):
        return {
            'strategy_id': self.strategy_id,
            'strategy_name': self.strategy_name,
            'template_type': self.template_type,
            'channel': self.channel,
            'subject_variant': self.subject_variant,
            'created_at': self.created_at.isoformat(),
            'status': self.status
        }


@dataclass
class StrategyMetrics:
    """策略指标"""
    strategy_id: str
    total_sent: int  # 总发送数
    delivered: int  # 送达数
    opened: int  # 打开数
    replied: int  # 回复数
    mql: int  # 营销合格线索
    sql: int  # 销售合格线索
    closed: int  # 成交数

    # 计算指标
    @property
    def delivery_rate(self) -> float:
        """送达率"""
        return self.delivered / self.total_sent if self.total_sent > 0 else 0

    @property
    def open_rate(self) -> float:
        """打开率"""
        return self.opened / self.delivered if self.delivered > 0 else 0

    @property
    def reply_rate(self) -> float:
        """回复率"""
        return self.replied / self.delivered if self.delivered > 0 else 0

    @property
    def mql_rate(self) -> float:
        """MQL转化率"""
        return self.mql / self.replied if self.replied > 0 else 0

    @property
    def sql_rate(self) -> float:
        """SQL转化率"""
        return self.sql / self.mql if self.mql > 0 else 0

    @property
    def close_rate(self) -> float:
        """成交率"""
        return self.closed / self.sql if self.sql > 0 else 0

    @property
    def overall_conversion(self) -> float:
        """整体转化率"""
        return self.closed / self.total_sent if self.total_sent > 0 else 0

    def to_dict(self):
        return {
            'strategy_id': self.strategy_id,
            'total_sent': self.total_sent,
            'delivered': self.delivered,
            'opened': self.opened,
            'replied': self.replied,
            'mql': self.mql,
            'sql': self.sql,
            'closed': self.closed,
            'delivery_rate': f"{self.delivery_rate*100:.1f}%",
            'open_rate': f"{self.open_rate*100:.1f}%",
            'reply_rate': f"{self.reply_rate*100:.1f}%",
            'mql_rate': f"{self.mql_rate*100:.1f}%",
            'sql_rate': f"{self.sql_rate*100:.1f}%",
            'close_rate': f"{self.close_rate*100:.1f}%",
            'overall_conversion': f"{self.overall_conversion*100:.2f}%"
        }


@dataclass
class ROICalculation:
    """ROI计算"""
    strategy_id: str
    total_cost: float  # 总成本
    total_revenue: float  # 总收入
    customer_ltv: float  # 客户终身价值
    cac: float  # 客户获取成本

    @property
    def roi(self) -> float:
        """投资回报率"""
        return (self.total_revenue - self.total_cost) / self.total_cost if self.total_cost > 0 else 0

    @property
    def ltv_cac_ratio(self) -> float:
        """LTV/CAC比率"""
        return self.customer_ltv / self.cac if self.cac > 0 else 0

    @property
    def is_positive_roi(self) -> bool:
        """是否正ROI"""
        return self.roi > 0

    def to_dict(self):
        return {
            'strategy_id': self.strategy_id,
            'total_cost': f"¥{self.total_cost:,.2f}",
            'total_revenue': f"¥{self.total_revenue:,.2f}",
            'customer_ltv': f"¥{self.customer_ltv:,.2f}",
            'cac': f"¥{self.cac:,.2f}",
            'roi': f"{self.roi*100:.1f}%",
            'ltv_cac_ratio': f"{self.ltv_cac_ratio:.2f}",
            'is_positive_roi': self.is_positive_roi
        }


class StrategyManager:
    """策略管理器"""

    def __init__(self):
        self.strategies: Dict[str, Strategy] = {}
        self.metrics: Dict[str, StrategyMetrics] = {}

    def create_strategy(self, strategy_name: str, template_type: str,
                       channel: str, subject_variant: str) -> Strategy:
        """创建策略"""
        strategy_id = f"strategy_{len(self.strategies) + 1}"

        strategy = Strategy(
            strategy_id=strategy_id,
            strategy_name=strategy_name,
            template_type=template_type,
            channel=channel,
            subject_variant=subject_variant,
            created_at=datetime.now(),
            status='active'
        )

        self.strategies[strategy_id] = strategy

        # 初始化指标
        self.metrics[strategy_id] = StrategyMetrics(
            strategy_id=strategy_id,
            total_sent=0,
            delivered=0,
            opened=0,
            replied=0,
            mql=0,
            sql=0,
            closed=0
        )

        print(f"✅ 创建策略: {strategy_name} (ID: {strategy_id})")
        return strategy

    def update_metrics(self, strategy_id: str, event: str):
        """更新指标"""
        if strategy_id not in self.metrics:
            print(f"❌ 策略不存在: {strategy_id}")
            return

        metrics = self.metrics[strategy_id]

        if event == 'sent':
            metrics.total_sent += 1
        elif event == 'delivered':
            metrics.delivered += 1
        elif event == 'opened':
            metrics.opened += 1
        elif event == 'replied':
            metrics.replied += 1
        elif event == 'mql':
            metrics.mql += 1
        elif event == 'sql':
            metrics.sql += 1
        elif event == 'closed':
            metrics.closed += 1

    def get_strategy_metrics(self, strategy_id: str) -> Optional[StrategyMetrics]:
        """获取策略指标"""
        return self.metrics.get(strategy_id)

    def get_all_metrics(self) -> List[StrategyMetrics]:
        """获取所有策略指标"""
        return list(self.metrics.values())

    def pause_strategy(self, strategy_id: str):
        """暂停策略"""
        if strategy_id in self.strategies:
            self.strategies[strategy_id].status = 'paused'
            print(f"⏸️ 暂停策略: {strategy_id}")

    def archive_strategy(self, strategy_id: str):
        """归档策略"""
        if strategy_id in self.strategies:
            self.strategies[strategy_id].status = 'archived'
            print(f"📦 归档策略: {strategy_id}")


class EliminationEngine:
    """淘汰引擎"""

    def __init__(self, stop_loss_threshold: float = 0.02, min_sample_size: int = 200):
        """
        Args:
            stop_loss_threshold: 止损线(回复率阈值)
            min_sample_size: 最小样本量
        """
        self.stop_loss_threshold = stop_loss_threshold
        self.min_sample_size = min_sample_size

    def should_eliminate(self, metrics: StrategyMetrics) -> tuple[bool, str]:
        """判断是否应该淘汰"""

        # 1. 样本量不足,继续观察
        if metrics.total_sent < self.min_sample_size:
            return False, f"样本量不足({metrics.total_sent}/{self.min_sample_size}),继续观察"

        # 2. 回复率低于止损线
        if metrics.reply_rate < self.stop_loss_threshold:
            return True, f"回复率{metrics.reply_rate*100:.2f}%低于止损线{self.stop_loss_threshold*100}%"

        # 3. 送达率过低
        if metrics.delivery_rate < 0.8:
            return True, f"送达率{metrics.delivery_rate*100:.1f}%过低,可能被标记为垃圾邮件"

        # 4. 打开率过低
        if metrics.open_rate < 0.1:
            return True, f"打开率{metrics.open_rate*100:.1f}%过低,主题行需要优化"

        return False, "策略表现正常"

    def rank_strategies(self, all_metrics: List[StrategyMetrics]) -> List[tuple[str, float]]:
        """策略排名"""
        # 综合评分 = 回复率 * 0.4 + 打开率 * 0.3 + 送达率 * 0.2 + 整体转化率 * 0.1
        scores = []

        for metrics in all_metrics:
            if metrics.total_sent < 50:  # 样本量太小,不参与排名
                continue

            score = (
                metrics.reply_rate * 0.4 +
                metrics.open_rate * 0.3 +
                metrics.delivery_rate * 0.2 +
                metrics.overall_conversion * 0.1
            )

            scores.append((metrics.strategy_id, score))

        # 按分数降序排序
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores

    def recommend_actions(self, metrics: StrategyMetrics) -> List[str]:
        """推荐优化动作"""
        recommendations = []

        # 送达率低
        if metrics.delivery_rate < 0.9:
            recommendations.append("🔧 优化发件人域名和IP信誉")
            recommendations.append("🔧 减少垃圾词汇,避免触发过滤器")

        # 打开率低
        if metrics.open_rate < 0.2:
            recommendations.append("🔧 A/B测试不同主题行")
            recommendations.append("🔧 增加个性化元素")
            recommendations.append("🔧 优化发送时间")

        # 回复率低
        if metrics.reply_rate < 0.05:
            recommendations.append("🔧 优化邮件正文,增强价值主张")
            recommendations.append("🔧 降低CTA摩擦,提供无风险测试")
            recommendations.append("🔧 增加社会证明和案例")

        # MQL转化率低
        if metrics.mql_rate < 0.3:
            recommendations.append("🔧 优化线索质量,提高ICP匹配度")
            recommendations.append("🔧 改进跟进话术")

        # SQL转化率低
        if metrics.sql_rate < 0.5:
            recommendations.append("🔧 优化销售流程")
            recommendations.append("🔧 提供更多价值证明")

        if not recommendations:
            recommendations.append("✅ 策略表现良好,继续执行")

        return recommendations


class ABTestingEngine:
    """A/B测试引擎"""

    def __init__(self):
        self.test_groups = {}

    def create_ab_test(self, test_name: str, variants: List[Strategy],
                      traffic_split: List[float] = None) -> str:
        """创建A/B测试"""
        test_id = f"test_{len(self.test_groups) + 1}"

        if not traffic_split:
            # 均分流量
            traffic_split = [1.0 / len(variants)] * len(variants)

        self.test_groups[test_id] = {
            'test_name': test_name,
            'variants': variants,
            'traffic_split': traffic_split,
            'created_at': datetime.now(),
            'status': 'running'
        }

        print(f"✅ 创建A/B测试: {test_name} (ID: {test_id})")
        print(f"   变体数: {len(variants)}")
        print(f"   流量分配: {[f'{s*100:.0f}%' for s in traffic_split]}")

        return test_id

    def select_variant(self, test_id: str) -> Optional[Strategy]:
        """选择变体(根据流量分配)"""
        if test_id not in self.test_groups:
            return None

        test = self.test_groups[test_id]
        variants = test['variants']
        traffic_split = test['traffic_split']

        # 根据流量分配随机选择
        rand = random.random()
        cumulative = 0

        for i, split in enumerate(traffic_split):
            cumulative += split
            if rand <= cumulative:
                return variants[i]

        return variants[-1]

    def analyze_test(self, test_id: str, all_metrics: Dict[str, StrategyMetrics]) -> Dict:
        """分析A/B测试结果"""
        if test_id not in self.test_groups:
            return {}

        test = self.test_groups[test_id]
        variants = test['variants']

        results = []
        for variant in variants:
            metrics = all_metrics.get(variant.strategy_id)
            if metrics:
                results.append({
                    'variant': variant.strategy_name,
                    'strategy_id': variant.strategy_id,
                    'reply_rate': metrics.reply_rate,
                    'open_rate': metrics.open_rate,
                    'overall_conversion': metrics.overall_conversion,
                    'total_sent': metrics.total_sent
                })

        # 找出最佳变体
        if results:
            best = max(results, key=lambda x: x['reply_rate'])
            return {
                'test_id': test_id,
                'test_name': test['test_name'],
                'variants': results,
                'winner': best
            }

        return {}


class QuantitativeEliminationSystem:
    """量化淘汰系统 - 主类"""

    def __init__(self, stop_loss_threshold: float = 0.02, min_sample_size: int = 200):
        self.strategy_manager = StrategyManager()
        self.elimination_engine = EliminationEngine(stop_loss_threshold, min_sample_size)
        self.ab_testing = ABTestingEngine()

    def create_parallel_strategies(self, count: int = 5) -> List[Strategy]:
        """创建并行策略"""
        print(f"\n🚀 创建 {count} 个并行策略...")

        strategies = []

        # 不同模板类型
        templates = ['融资扩张', '团队招聘', '产品上线', '竞品对比', '技术痛点']

        # 不同主题行风格
        subject_styles = [
            '直接价值型',
            '好奇心型',
            '紧迫感型',
            '社交证明型',
            '个性化型'
        ]

        for i in range(count):
            strategy = self.strategy_manager.create_strategy(
                strategy_name=f"策略{i+1}: {templates[i % len(templates)]} + {subject_styles[i % len(subject_styles)]}",
                template_type=templates[i % len(templates)],
                channel='email',
                subject_variant=subject_styles[i % len(subject_styles)]
            )
            strategies.append(strategy)

        print(f"✅ 创建完成")
        return strategies

    def simulate_campaign(self, strategy_id: str, send_count: int = 100):
        """模拟营销活动(用于测试)"""
        print(f"\n📊 模拟策略 {strategy_id} 发送 {send_count} 次...")

        # 模拟不同策略的表现
        # 实际应该是真实的发送和追踪
        for _ in range(send_count):
            self.strategy_manager.update_metrics(strategy_id, 'sent')

            # 送达率 85-95%
            if random.random() < 0.9:
                self.strategy_manager.update_metrics(strategy_id, 'delivered')

                # 打开率 15-35%
                if random.random() < 0.25:
                    self.strategy_manager.update_metrics(strategy_id, 'opened')

                    # 回复率 2-10%
                    if random.random() < 0.05:
                        self.strategy_manager.update_metrics(strategy_id, 'replied')

                        # MQL转化率 30-50%
                        if random.random() < 0.4:
                            self.strategy_manager.update_metrics(strategy_id, 'mql')

                            # SQL转化率 40-60%
                            if random.random() < 0.5:
                                self.strategy_manager.update_metrics(strategy_id, 'sql')

                                # 成交率 30-50%
                                if random.random() < 0.4:
                                    self.strategy_manager.update_metrics(strategy_id, 'closed')

    def run_elimination_check(self):
        """运行淘汰检查"""
        print("\n" + "="*60)
        print("🔍 运行淘汰检查")
        print("="*60)

        all_metrics = self.strategy_manager.get_all_metrics()

        for metrics in all_metrics:
            should_eliminate, reason = self.elimination_engine.should_eliminate(metrics)

            strategy = self.strategy_manager.strategies.get(metrics.strategy_id)
            if not strategy:
                continue

            print(f"\n策略: {strategy.strategy_name}")
            print(f"  样本量: {metrics.total_sent}")
            print(f"  回复率: {metrics.reply_rate*100:.2f}%")

            if should_eliminate:
                print(f"  ❌ 淘汰原因: {reason}")
                self.strategy_manager.archive_strategy(metrics.strategy_id)
            else:
                print(f"  ✅ {reason}")

                # 提供优化建议
                recommendations = self.elimination_engine.recommend_actions(metrics)
                if recommendations:
                    print(f"  💡 优化建议:")
                    for rec in recommendations[:3]:
                        print(f"     {rec}")

    def show_dashboard(self):
        """显示Dashboard"""
        print("\n" + "="*60)
        print("📊 量化淘汰系统Dashboard")
        print("="*60)

        all_metrics = self.strategy_manager.get_all_metrics()

        if not all_metrics:
            print("\n暂无数据")
            return

        # 策略排名
        rankings = self.elimination_engine.rank_strategies(all_metrics)

        print(f"\n🏆 策略排名 (Top 5):")
        for i, (strategy_id, score) in enumerate(rankings[:5], 1):
            strategy = self.strategy_manager.strategies.get(strategy_id)
            metrics = self.strategy_manager.metrics.get(strategy_id)

            if strategy and metrics:
                print(f"\n{i}. {strategy.strategy_name}")
                print(f"   综合得分: {score*100:.1f}")
                print(f"   发送: {metrics.total_sent} | 回复率: {metrics.reply_rate*100:.1f}% | 转化: {metrics.closed}")

        # 整体统计
        total_sent = sum(m.total_sent for m in all_metrics)
        total_replied = sum(m.replied for m in all_metrics)
        total_closed = sum(m.closed for m in all_metrics)

        print(f"\n📈 整体统计:")
        print(f"  总发送: {total_sent}")
        print(f"  总回复: {total_replied} ({total_replied/total_sent*100:.1f}%)")
        print(f"  总成交: {total_closed} ({total_closed/total_sent*100:.2f}%)")

        # 活跃策略数
        active = len([s for s in self.strategy_manager.strategies.values() if s.status == 'active'])
        paused = len([s for s in self.strategy_manager.strategies.values() if s.status == 'paused'])
        archived = len([s for s in self.strategy_manager.strategies.values() if s.status == 'archived'])

        print(f"\n📋 策略状态:")
        print(f"  活跃: {active}")
        print(f"  暂停: {paused}")
        print(f"  归档: {archived}")

    def export_report(self, filename: str = None):
        """导出报告"""
        if not filename:
            filename = f"elimination_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        all_metrics = self.strategy_manager.get_all_metrics()

        data = []
        for metrics in all_metrics:
            strategy = self.strategy_manager.strategies.get(metrics.strategy_id)
            if strategy:
                row = {
                    '策略ID': strategy.strategy_id,
                    '策略名称': strategy.strategy_name,
                    '模板类型': strategy.template_type,
                    '主题变体': strategy.subject_variant,
                    '状态': strategy.status,
                    '总发送': metrics.total_sent,
                    '送达': metrics.delivered,
                    '打开': metrics.opened,
                    '回复': metrics.replied,
                    'MQL': metrics.mql,
                    'SQL': metrics.sql,
                    '成交': metrics.closed,
                    '送达率': f"{metrics.delivery_rate*100:.1f}%",
                    '打开率': f"{metrics.open_rate*100:.1f}%",
                    '回复率': f"{metrics.reply_rate*100:.1f}%",
                    '整体转化率': f"{metrics.overall_conversion*100:.2f}%"
                }
                data.append(row)

        df = pd.DataFrame(data)
        df.to_excel(filename, index=False)

        print(f"\n✅ 报告已导出: {filename}")
        return filename


def demo():
    """演示"""
    print("="*60)
    print("🎯 量化淘汰系统 - 演示")
    print("="*60)

    # 创建系统
    system = QuantitativeEliminationSystem(
        stop_loss_threshold=0.02,  # 2%回复率止损线
        min_sample_size=200  # 200次最小样本
    )

    # 1. 创建并行策略
    strategies = system.create_parallel_strategies(count=5)

    # 2. 模拟营销活动
    print("\n" + "="*60)
    print("📊 模拟营销活动")
    print("="*60)

    for strategy in strategies:
        # 模拟不同策略发送不同数量
        send_count = random.randint(150, 250)
        system.simulate_campaign(strategy.strategy_id, send_count)

    # 3. 运行淘汰检查
    system.run_elimination_check()

    # 4. 显示Dashboard
    system.show_dashboard()

    # 5. 导出报告
    system.export_report()


if __name__ == "__main__":
    demo()
