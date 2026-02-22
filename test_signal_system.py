"""
信号驱动系统测试脚本
快速测试信号检测和邮件生成功能
"""

from lead_generation_complete import (
    StudyAbroadSignalDetector,
    DeepSeekEmailGenerator,
    IntentSignal,
    SignalType,
    UrgencyLevel
)
from datetime import datetime
import json


def test_signal_detection():
    """测试信号检测"""
    print("="*60)
    print("🧪 测试1: 信号检测")
    print("="*60)

    detector = StudyAbroadSignalDetector()

    # 测试用例
    test_cases = [
        {
            'content': '想问一下美国留学申请需要什么条件?我的GPA是3.5,托福还没考',
            'author': '小明',
            'platform': '小红书',
            'expected_signal': '询问申请条件'
        },
        {
            'content': '雅思考了3次还是6.5,怎么办?申请季马上就要到了,好着急',
            'author': '小红',
            'platform': '知乎',
            'expected_signal': '咨询语言考试'
        },
        {
            'content': '留学费用大概多少?家里预算有限,能申请奖学金吗?',
            'author': '小李',
            'platform': '小红书',
            'expected_signal': '费用焦虑'
        },
        {
            'content': '现在大三下学期了,准备留学还来得及吗?需要准备什么?',
            'author': '小王',
            'platform': '知乎',
            'expected_signal': '时间紧迫'
        },
        {
            'content': '不知道选什么专业好,商科和计算机都感兴趣,求推荐',
            'author': '小张',
            'platform': '小红书',
            'expected_signal': '专业选择'
        }
    ]

    results = []
    for i, case in enumerate(test_cases, 1):
        print(f"\n测试用例 {i}:")
        print(f"内容: {case['content']}")
        print(f"作者: {case['author']}")
        print(f"平台: {case['platform']}")

        signal = detector.detect_from_content(
            case['content'],
            case['author'],
            case['platform']
        )

        if signal:
            print(f"\n✅ 检测到信号:")
            print(f"  信号名称: {signal.signal_name}")
            print(f"  紧迫度: {signal.urgency.value}")
            print(f"  置信度: {signal.confidence*100:.0f}%")
            print(f"  痛点: {signal.pain_point}")
            print(f"  潜在损失: {signal.financial_loss}")

            results.append({
                'case': i,
                'detected': True,
                'signal': signal.signal_name,
                'urgency': signal.urgency.value
            })
        else:
            print(f"\n❌ 未检测到信号")
            results.append({
                'case': i,
                'detected': False
            })

    # 统计
    print(f"\n{'='*60}")
    print("📊 检测统计")
    print(f"{'='*60}")
    detected = sum(1 for r in results if r['detected'])
    print(f"总测试: {len(test_cases)}")
    print(f"检测到: {detected} ({detected/len(test_cases)*100:.0f}%)")

    return results


def test_email_generation():
    """测试邮件生成"""
    print("\n" + "="*60)
    print("🧪 测试2: 邮件生成")
    print("="*60)

    generator = DeepSeekEmailGenerator()

    # 创建测试信号
    test_signal = IntentSignal(
        signal_type=SignalType.BEHAVIOR,
        signal_name="小红书-咨询语言考试",
        company="个人学生",
        contact_person="小明",
        detected_at=datetime.now(),
        urgency=UrgencyLevel.CRITICAL,
        confidence=0.9,
        raw_data={
            'platform': '小红书',
            'content': '雅思考了3次还是6.5,怎么办?申请季马上就要到了',
            'matched_keywords': ['雅思', '申请季', '着急']
        },
        pain_point='语言成绩是申请门槛,急需提分',
        financial_loss='成绩不达标,无法申请目标院校'
    )

    # 创建测试线索
    test_lead = {
        'username': '小明',
        'content': '雅思考了3次还是6.5,怎么办?申请季马上就要到了,好着急',
        'platform': '小红书'
    }

    print("\n测试信号:")
    print(f"  信号名称: {test_signal.signal_name}")
    print(f"  紧迫度: {test_signal.urgency.value}")
    print(f"  痛点: {test_signal.pain_point}")

    print("\n🤖 生成邮件...")
    email = generator.generate_signal_driven_email(test_signal, test_lead)

    print(f"\n✅ 邮件生成完成")
    print(f"  生成方式: {email['generated_by']}")
    print(f"\n📧 主题: {email['subject']}")
    print(f"\n📝 正文:\n{email['body']}")

    return email


def test_complete_workflow():
    """测试完整工作流"""
    print("\n" + "="*60)
    print("🧪 测试3: 完整工作流")
    print("="*60)

    detector = StudyAbroadSignalDetector()
    generator = DeepSeekEmailGenerator()

    # 模拟抓取的线索
    mock_leads = [
        {
            'username': '小明',
            'content': '想问一下美国留学申请需要什么条件?我的GPA是3.5,托福还没考',
            'platform': '小红书',
            'url': 'https://xiaohongshu.com/xxx'
        },
        {
            'username': '小红',
            'content': '雅思考了3次还是6.5,怎么办?申请季马上就要到了,好着急',
            'platform': '知乎',
            'url': 'https://zhihu.com/yyy'
        },
        {
            'username': '小李',
            'content': '留学费用大概多少?家里预算有限,能申请奖学金吗?',
            'platform': '小红书',
            'url': 'https://xiaohongshu.com/zzz'
        }
    ]

    print(f"\n处理 {len(mock_leads)} 个线索...")

    results = []
    for i, lead in enumerate(mock_leads, 1):
        print(f"\n{'='*60}")
        print(f"线索 {i}/{len(mock_leads)}")
        print(f"{'='*60}")
        print(f"用户: {lead['username']}")
        print(f"内容: {lead['content'][:50]}...")

        # 1. 检测信号
        signal = detector.detect_from_content(
            lead['content'],
            lead['username'],
            lead['platform'],
            lead['url']
        )

        if signal:
            print(f"\n✅ 检测到信号: {signal.signal_name}")
            print(f"   紧迫度: {signal.urgency.value}")

            # 2. 生成邮件
            print(f"\n🤖 生成邮件...")
            email = generator.generate_signal_driven_email(signal, lead)

            print(f"\n📧 主题: {email['subject']}")

            results.append({
                'lead': lead['username'],
                'signal': signal.signal_name,
                'urgency': signal.urgency.value,
                'subject': email['subject'],
                'generated_by': email['generated_by']
            })
        else:
            print(f"\n❌ 未检测到信号,跳过")

    # 统计
    print(f"\n{'='*60}")
    print("📊 处理统计")
    print(f"{'='*60}")
    print(f"总线索: {len(mock_leads)}")
    print(f"检测到信号: {len(results)}")
    print(f"生成邮件: {len(results)}")

    if results:
        print(f"\n生成的邮件:")
        for i, r in enumerate(results, 1):
            print(f"\n{i}. {r['lead']}")
            print(f"   信号: {r['signal']}")
            print(f"   主题: {r['subject']}")

    return results


def main():
    """主函数"""
    print("="*60)
    print("🚀 信号驱动系统测试")
    print("="*60)

    try:
        # 测试1: 信号检测
        signal_results = test_signal_detection()

        # 测试2: 邮件生成
        email_result = test_email_generation()

        # 测试3: 完整工作流
        workflow_results = test_complete_workflow()

        # 总结
        print("\n" + "="*60)
        print("✅ 所有测试完成")
        print("="*60)

        print("\n测试结果:")
        print(f"1. 信号检测: {len([r for r in signal_results if r['detected']])}/{len(signal_results)} 成功")
        print(f"2. 邮件生成: {'成功' if email_result else '失败'}")
        print(f"3. 完整工作流: {len(workflow_results)} 个邮件生成")

        print("\n下一步:")
        print("1. 运行 python lead_generation_complete.py 开始实际抓取")
        print("2. 查看生成的Excel文件")
        print("3. 复制邮件内容并发送")
        print("4. 追踪效果并执行量化淘汰")

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
