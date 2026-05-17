from typing import Dict, List

DEFAULT_VERTICAL = "china_social_b2b"

_BASE_COMPETITOR = [
    "机构", "中介", "顾问", "工作室", "代理", "官方", "课程顾问", "服务报价", "代运营", "代办", "欢迎咨询", "私信我", "加v", "加微", "VX", "wechat",
]

_PLAYBOOKS: Dict[str, Dict] = {
    "china_social_b2b": {
        "label": "中国社媒 B2B 线索买家",
        "icp": "在小红书/抖音做获客、招生、出海增长，且正在抱怨线索质量或转化成本的老板与增长负责人",
        "default_platforms": ["xhs", "douyin"],
        "allow_provider_authors": True,
        "reach_keywords": ["获客", "招生", "线索", "咨询量", "转化", "投放", "出海", "跨境", "雅思", "留学", "外贸", "代运营"],
        "intent_keywords": ["获客难", "招生难", "线索质量差", "咨询少", "转化低", "投放亏", "询盘质量差", "找客户", "找学生", "预算"],
        "target_hints": ["获客难", "招生难", "线索质量", "咨询量少", "转化低", "询盘质量差", "找海外客户", "找学生", "老板要求", "预算可以"],
        "competitor_keywords": ["同行软广", "免费领取", "课程分销", "招商加盟", "割韭菜"],
        "pain_points": ["线索质量差", "投放成本高", "销售跟进无效", "招生咨询少", "海外询盘不精准"],
        "default_cta": "回复“样本”，先看 3 条你赛道的真实高意向线索",
        "default_region": "China",
        "default_role": "Founder/Growth",
        "default_industry": "B2B Services",
        "default_request": "AI 驱动线索供应的潜在买家，优先最新、最痛、可手动触达",
    },
    "ielts_training": {
        "label": "雅思机构招生",
        "icp": "正在找雅思/托福培训、语言班、一对一提分服务的学生或家长",
        "default_platforms": ["xhs", "douyin"],
        "reach_keywords": ["雅思", "托福", "语言班", "口语", "写作", "一对一", "培训班", "保分", "上岸", "试听"],
        "intent_keywords": ["求推荐", "哪家好", "想报班", "考不过", "急需", "费用", "预算", "一对一", "提分"],
        "target_hints": ["雅思", "托福", "想报班", "求推荐", "哪家好", "一对一", "急需", "语言成绩", "con offer"],
        "competitor_keywords": ["雅思机构", "培训机构", "课程顾问", "保分班", "欢迎咨询", "报名链接", "试听课"],
        "pain_points": ["语言成绩卡住", "不知道报哪家", "短期提分压力", "预算和课程匹配不确定"],
        "default_cta": "回复“雅思”，领取 10 分钟课程匹配建议",
        "default_region": "China",
        "default_role": "Student/Parent",
        "default_industry": "Language Training",
        "default_request": "雅思/托福培训高意向学生，优先近期考试和有条件录取人群",
    },
    "overseas_study_agency": {
        "label": "留学中介获客",
        "icp": "对选校、文书、补录、签证和申请规划有明确需求的学生或家长",
        "default_platforms": ["xhs", "douyin"],
        "reach_keywords": ["留学", "申请", "文书", "中介", "择校", "签证", "offer", "补录", "语言班", "预算"],
        "intent_keywords": ["求推荐", "求助", "请问", "怎么选", "想找中介", "文书救命", "申请来不及", "补录", "避雷"],
        "target_hints": ["留学中介推荐", "求推荐", "求助", "怎么选", "文书", "补录", "签证", "预算", "避雷"],
        "competitor_keywords": ["保录", "留学咨询", "申请服务", "背景提升", "顾问老师", "教育机构"],
        "pain_points": ["选校不确定", "申请时间线紧", "文书和签证压力", "担心中介不靠谱"],
        "default_cta": "回复“评估”，领取 10 分钟选校与申请诊断",
        "default_region": "China",
        "default_role": "Student/Parent",
        "default_industry": "Study Abroad",
        "default_request": "高意向留学个人客户，优先 26Fall 尾盘和 27Fall 早鸟",
    },
    "cross_border_b2b": {
        "label": "高端出海 B2B 制造",
        "icp": "外贸工厂、制造业品牌、B2B 出海团队，正在找海外客户或抱怨询盘质量差",
        "default_platforms": ["xhs", "douyin"],
        "allow_provider_authors": True,
        "reach_keywords": ["外贸", "出海", "海外客户", "询盘", "独立站", "B2B", "制造业", "工厂", "经销商", "代理商"],
        "intent_keywords": ["询盘质量差", "找海外客户", "获客难", "展会效果差", "海关数据没用", "LinkedIn效果差", "预算"],
        "target_hints": ["询盘质量差", "找海外客户", "找经销商", "找代理", "获客难", "海外营销", "预算"],
        "competitor_keywords": ["外贸培训", "海关数据代理", "群发软件", "课程招商", "代发询盘"],
        "pain_points": ["海外询盘不精准", "传统渠道成本高", "销售跟进大量无效客户", "出海渠道转化低"],
        "default_cta": "回复“出海样本”，看 3 条海外买家意图线索",
        "default_region": "China",
        "default_role": "Founder/Sales Director",
        "default_industry": "Export Manufacturing",
        "default_request": "高端出海 B2B 制造团队，重点筛选询盘质量与海外获客痛点",
    },
    "cross_border_ecom_ops": {
        "label": "跨境电商代运营/出海增长",
        "icp": "跨境卖家、品牌方或代运营服务商，正在找红人营销、独立站投放、TikTok Shop 或服务商",
        "default_platforms": ["xhs", "douyin"],
        "allow_provider_authors": True,
        "reach_keywords": ["跨境电商", "亚马逊", "TikTok Shop", "shopify", "独立站", "代运营", "红人营销", "海外投放", "广告", "ROAS"],
        "intent_keywords": ["找代运营", "求推荐", "广告亏", "投放亏", "转化低", "独立站没人买", "红人合作", "预算", "要案例"],
        "target_hints": ["找代运营", "求推荐", "广告亏", "投放亏", "转化低", "红人合作", "想找服务商", "预算可以谈", "要案例"],
        "competitor_keywords": ["刷单", "黑科技", "招商加盟", "课程代理"],
        "pain_points": ["广告投放亏损", "独立站转化低", "红人合作难筛选", "代运营服务商质量不稳定"],
        "default_cta": "回复“跨境样本”，看 3 条近期高意向需求",
        "default_region": "China",
        "default_role": "Founder/Operator",
        "default_industry": "Cross-border E-commerce",
        "default_request": "跨境电商和出海服务买家，优先找服务商、要案例、问预算的人",
    },
    "study_abroad": {
        "label": "留学服务",
        "icp": "计划出国读书、对选校/申请/文书/签证有明确需求的个人",
        "default_platforms": ["xhs", "douyin"],
        "reach_keywords": ["留学", "选校", "申请", "文书", "签证", "雅思", "托福", "offer", "gpa", "deadline"],
        "intent_keywords": ["求推荐", "求助", "请问", "怎么办", "怎么选", "预算", "中介", "文书", "签证", "ddl"],
        "target_hints": ["求推荐", "预算", "申请", "选校", "文书", "签证", "offer", "雅思", "托福", "gpa"],
        "competitor_keywords": ["保录", "留学咨询", "申请服务", "背景提升"],
        "pain_points": ["选校不确定", "预算与结果不匹配", "材料准备无从下手", "时间线风险"],
        "default_cta": "回复“评估”领取10分钟选校与申请诊断",
        "default_region": "Singapore",
        "default_role": "Student",
        "default_industry": "Education",
        "default_request": "高意向留学个人客户（优先可私信主页）",
    },
    "indie_ai_tools": {
        "label": "独立开发 AI 工具",
        "icp": "在做或准备购买 AI 自动化/增长工具的独立开发者与小团队",
        "default_platforms": ["xhs", "douyin"],
        "reach_keywords": ["独立开发", "vibe coding", "MVP", "AI工具", "自动化", "no-code", "增长", "订阅", "SaaS", "agent"],
        "intent_keywords": ["求推荐", "有啥工具", "怎么获客", "转化低", "留存低", "想买", "预算", "付费", "ROI", "自动化"],
        "target_hints": ["MVP", "订阅", "月活", "留存", "CAC", "LTV", "付费墙", "冷启动", "增长"],
        "competitor_keywords": ["代运营", "包获客", "包变现", "代投放"],
        "pain_points": ["流量买得起但转化差", "激活路径太长", "留存与复购低", "缺少稳定获客管道"],
        "default_cta": "回复“增长方案”，获取 7 天获客自动化落地清单",
        "default_region": "Global",
        "default_role": "Founder",
        "default_industry": "AI SaaS",
        "default_request": "独立开发 AI 产品创始人，存在获客与转化痛点",
    },
    "cross_border_ecom": {
        "label": "跨境电商",
        "icp": "在 Amazon/Shopify/独立站经营并有投放和转化压力的商家",
        "default_platforms": ["xhs", "douyin"],
        "reach_keywords": ["跨境电商", "亚马逊", "shopify", "独立站", "listing", "投流", "广告", "选品", "复购", "ROI"],
        "intent_keywords": ["转化低", "广告亏损", "客单价", "复购", "退货", "求推荐", "找工具", "预算", "增长"],
        "target_hints": ["广告", "ROAS", "选品", "转化率", "复购率", "客单价", "库存压力"],
        "competitor_keywords": ["代运营公司", "包上首页", "刷单", "代投"],
        "pain_points": ["广告成本高", "点击高下单低", "复购不足", "运营成本上升"],
        "default_cta": "回复“诊断”获取 1 份跨境增长漏斗优化建议",
        "default_region": "US",
        "default_role": "Founder",
        "default_industry": "E-commerce",
        "default_request": "跨境电商商家，重点筛选有投放与转化痛点的决策者",
    },
    "education_training": {
        "label": "教育培训",
        "icp": "语言培训/职业教育机构的招生与增长负责人",
        "default_platforms": ["xhs", "douyin"],
        "reach_keywords": ["培训", "招生", "课程", "转化", "试听", "私域", "投放", "线索", "报名", "续费"],
        "intent_keywords": ["招生难", "转化低", "续费低", "求推荐", "怎么做", "预算", "线索质量"],
        "target_hints": ["招生", "报名", "试听", "续费", "课程顾问", "转化"],
        "competitor_keywords": ["教培机构", "招生代理", "包过"],
        "pain_points": ["线索质量低", "顾问跟进效率低", "复购续费低", "投放成本高"],
        "default_cta": "回复“招生”领取教育培训获客 SOP",
        "default_region": "China",
        "default_role": "运营负责人",
        "default_industry": "Education",
        "default_request": "教育培训机构增长负责人，关注招生转化与续费",
    },
    "local_services": {
        "label": "本地生活服务",
        "icp": "医美/律所/装修/家政等高客单本地服务商家负责人",
        "default_platforms": ["xhs", "douyin"],
        "reach_keywords": ["本地服务", "同城", "客资", "私信", "到店", "咨询", "美团", "大众点评", "转化", "预约"],
        "intent_keywords": ["获客难", "到店低", "咨询少", "转化低", "求推荐", "预算", "复购"],
        "target_hints": ["到店", "预约", "私信", "电话咨询", "转化率", "复购"],
        "competitor_keywords": ["地推团队", "代运营", "全包获客"],
        "pain_points": ["线索成本高", "有效咨询少", "到店转化低", "复购不足"],
        "default_cta": "回复“到店增长”领取同城获客优化方案",
        "default_region": "China",
        "default_role": "店主/合伙人",
        "default_industry": "Local Service",
        "default_request": "本地生活服务商家负责人，优先高客单与可私信线索",
    },
}


def normalize_vertical_key(key: str) -> str:
    raw = str(key or "").strip().lower()
    return raw if raw in _PLAYBOOKS else DEFAULT_VERTICAL


def list_vertical_playbooks() -> List[Dict]:
    out: List[Dict] = []
    for key, value in _PLAYBOOKS.items():
        item = dict(value)
        item["key"] = key
        out.append(item)
    return out


def get_vertical_playbook(key: str) -> Dict:
    vk = normalize_vertical_key(key)
    payload = dict(_PLAYBOOKS[vk])
    payload["key"] = vk

    sector_comp = [str(x).strip() for x in payload.get("competitor_keywords", []) if str(x).strip()]
    comp = list(dict.fromkeys(_BASE_COMPETITOR + sector_comp))
    payload["competitor_keywords"] = comp
    payload["intent_keywords"] = [str(x).strip() for x in payload.get("intent_keywords", []) if str(x).strip()]
    payload["target_hints"] = [str(x).strip() for x in payload.get("target_hints", []) if str(x).strip()]
    payload["reach_keywords"] = [str(x).strip() for x in payload.get("reach_keywords", []) if str(x).strip()]
    payload["pain_points"] = [str(x).strip() for x in payload.get("pain_points", []) if str(x).strip()]
    payload["default_platforms"] = [str(x).strip().lower() for x in payload.get("default_platforms", ["xhs", "douyin"]) if str(x).strip()]
    payload["allow_provider_authors"] = bool(payload.get("allow_provider_authors", False))
    return payload


def vertical_label(key: str) -> str:
    return get_vertical_playbook(key).get("label", DEFAULT_VERTICAL)


def vertical_options() -> List[str]:
    return list(_PLAYBOOKS.keys())


def build_vertical_query(key: str, max_terms: int = 10) -> str:
    pb = get_vertical_playbook(key)
    terms = pb.get("reach_keywords", []) + pb.get("intent_keywords", [])
    dedup = []
    seen = set()
    for tok in terms:
        s = str(tok).strip()
        if not s:
            continue
        if s.lower() in seen:
            continue
        seen.add(s.lower())
        dedup.append(s)
        if len(dedup) >= max(3, int(max_terms or 10)):
            break
    return " ".join(dedup)
