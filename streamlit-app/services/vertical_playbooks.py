from typing import Dict, List

DEFAULT_VERTICAL = "study_abroad"

_BASE_COMPETITOR = [
    "机构", "中介", "顾问", "工作室", "代理", "官方", "课程顾问", "服务报价", "代运营", "代办", "欢迎咨询", "私信我", "加v", "加微", "VX", "wechat",
]

_PLAYBOOKS: Dict[str, Dict] = {
    "study_abroad": {
        "label": "留学服务",
        "icp": "计划出国读书、对选校/申请/文书/签证有明确需求的个人",
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
