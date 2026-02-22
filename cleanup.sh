#!/bin/bash
# 清理LeadPulse项目,只保留核心文件

echo "🧹 开始清理项目..."

cd "$(dirname "$0")"

# 1. 创建核心文件列表
echo "📋 保留以下核心文件:"

# 核心Python代码
CORE_FILES=(
    # Gemini获客系统(最新)
    "Gemini获客Prompt工程.md"
    "Gemini获客快速开始.md"
    "gemini_data_importer.py"

    # 邮件系统
    "email_auto_sender.py"
    "streamlit-app/ai_lead_generator.py"

    # 信号驱动系统
    "intent_signal_hijacker.py"
    "signal_driven_outbound.py"
    "data_orchestration_agent.py"
    "quantitative_elimination.py"

    # 完整获客流程
    "lead_generation_complete.py"
    "scraper_manager.py"

    # 评分系统
    "streamlit-app/lead_scoring.py"

    # Cookie管理
    "cookie_manager.py"

    # 测试脚本
    "test_signal_system.py"
    "test_email_system.py"

    # 核心文档
    "使用说明.md"
    "README.md"
    "快速开始.md"

    # 配置文件
    "requirements.txt"
    ".gitignore"
    ".env.example"
)

# 2. 删除旧文档(保留最新的)
echo "🗑️  删除过时文档..."

rm -f "完整功能总结.md"
rm -f "完善总结.md"
rm -f "COMPLETE-SYSTEM-README.md"
rm -f "SYSTEM-ARCHITECTURE.md"
rm -f "LEAD-GENERATION-ARCHITECTURE.md"
rm -f "AI获客底层逻辑.md"
rm -f "2026_ultimate_acquisition_strategy.md"

# 医美相关(已改为留学)
rm -f "MVP产品包-医美诊所.md"
rm -f "客户获取计划-医美诊所.md"
rm -f "按结果付费方案-医美诊所.md"
rm -f "销售演示脚本-医美诊所.md"
rm -f "销售材料包-医美诊所.md"
rm -f "验证指标Dashboard-医美诊所.md"
rm -f "验证指标Dashboard-医美诊所.xlsx"
rm -f "商业化验证MVP-总览.md"
rm -f "7天MVP验证计划.md"
rm -f "端到端商业化闭环.md"

# 重复的README
rm -f "SIGNAL_DRIVEN_OUTREACH_README.md"
rm -f "SIGNAL_OUTREACH_SUMMARY.md"
rm -f "SIGNAL_SYSTEM_README.md"
rm -f "EMAIL_SYSTEM_README.md"
rm -f "README_EMAIL_CAMPAIGN.md"
rm -f "OPTIMIZATION_SUMMARY.md"
rm -f "COOKIE_IMPLEMENTATION_SUMMARY.md"
rm -f "COOKIE_MANAGER_README.md"
rm -f "COOKIE_QUICKSTART.md"

# 重复的指南
rm -f "留学获客系统-使用说明.md"
rm -f "留学获客快速启动指南.md"
rm -f "通用行业适配指南.md"
rm -f "规模化路径图.md"
rm -f "线索质量标准.md"
rm -f "客户案例模板.md"
rm -f "服务合同模板.md"
rm -f "销售话术脚本.md"
rm -f "文档索引.md"

# 演示相关(已整合)
rm -f "演示PPT大纲.md"
rm -f "演示视频脚本.md"

# 邮件模板(已整合)
rm -f "email_templates_study_abroad.md"
rm -f "signal_driven_email_templates.md"
rm -f "邮件模板-留学行业.md"
rm -f "邮件生成系统说明.md"

# 话术模板(已整合)
rm -f "首批客户话术模板.md"
rm -f "销售话术脚本.md"

# 旧的测试/演示脚本
rm -f "demo.py"
rm -f "demo_email_campaign.py"
rm -f "quick_start.py"
rm -f "compare_versions.py"
rm -f "test_cookie_system.py"
rm -f "test_email_generator.py"
rm -f "signal_outreach_examples.py"

# 旧的工具脚本
rm -f "cookie_tool.py"
rm -f "email_config.py"
rm -f "create_dashboard.py"
rm -f "create_roi_tracker.py"
rm -f "industry_config_generator.py"

# 安装脚本(不需要)
rm -f "install_cookie_system.bat"
rm -f "install_cookie_system.sh"

# 输出文件
rm -f *.xlsx
rm -f email_list_template.xlsx

# 商业模式文档(已过时)
rm -f "lead_gen_agency_model.md"

# 评分指南(已整合到代码)
rm -f "streamlit-app/lead_scoring_guide.md"

# 3. 删除tests目录(测试代码已整合)
if [ -d "tests" ]; then
    echo "🗑️  删除tests目录..."
    rm -rf tests/
fi

# 4. 清理scrapers目录(保留但清理重复文件)
if [ -d "scrapers" ]; then
    echo "🧹 清理scrapers目录..."
    cd scrapers/
    # 只保留v2版本
    rm -f xiaohongshu_scraper.py
    rm -f zhihu_scraper.py
    rm -f weibo_scraper.py
    cd ..
fi

# 5. 清理输出文件
echo "🗑️  清理输出文件..."
rm -f outreach_tracking_*.xlsx
rm -f signal_driven_outreach_*.xlsx

echo "✅ 清理完成!"
echo ""
echo "📦 保留的核心文件:"
echo "  - Gemini获客系统 (3个文件)"
echo "  - 邮件营销系统 (2个文件)"
echo "  - 信号驱动系统 (4个文件)"
echo "  - 完整获客流程 (2个文件)"
echo "  - 测试脚本 (2个文件)"
echo "  - 核心文档 (3个文件)"
echo ""
echo "🚀 项目已精简,可以提交到GitHub了!"
