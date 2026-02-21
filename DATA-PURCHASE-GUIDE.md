# 💰 购买用户数据方案 - 最佳实践

## 为什么买数据比自己抓更好?

| 对比项 | 自己抓取 | 购买数据 |
|--------|---------|---------|
| 合法性 | ⚠️ 灰色地带 | ✅ 合法合规 |
| 数据质量 | ⭐⭐ 不稳定 | ⭐⭐⭐⭐⭐ 高质量 |
| 邮箱准确率 | 30-50% | 90%+ |
| 维护成本 | 高(经常被封) | 低(按需付费) |
| 时间成本 | 高(需要开发维护) | 低(直接调API) |
| 推荐度 | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 推荐的数据服务商

### 1. Apollo.io (最推荐)

**数据规模**: 2.1亿+联系人, 3000万+公司

**定价**:
- Free: $0/月 (50个邮箱/月)
- Basic: $49/月 (1,200个邮箱/月)
- Professional: $79/月 (12,000个邮箱/月)
- Organization: $119/月 (24,000个邮箱/月)

**特点**:
- ✅ 数据最全(LinkedIn + 公开数据)
- ✅ 邮箱验证准确率95%+
- ✅ 提供API,可以直接集成
- ✅ 支持按行业/职位/公司筛选
- ✅ 自带CRM功能

**适合**: 留学机构找海外客户(美国/英国/加拿大)

**API示例**:
```python
import requests

def search_apollo(keywords, location):
    url = "https://api.apollo.io/v1/mixed_people/search"
    headers = {"X-Api-Key": "你的API Key"}

    data = {
        "q_keywords": keywords,
        "person_locations": [location],
        "page": 1,
        "per_page": 25
    }

    response = requests.post(url, headers=headers, json=data)
    return response.json()

# 搜索美国的留学顾问
results = search_apollo("study abroad consultant", "United States")
```

**网址**: https://www.apollo.io/

---

### 2. ZoomInfo (企业级)

**数据规模**: 1.4亿+联系人

**定价**:
- 需要联系销售(通常$15,000+/年)
- 适合大企业

**特点**:
- ✅ 数据最准确
- ✅ 企业级功能
- ❌ 价格贵
- ❌ 主要针对美国市场

**适合**: 大型留学机构

---

### 3. Lusha (性价比高)

**定价**:
- Free: $0/月 (5个邮箱/月)
- Pro: $29/月 (480个邮箱/月)
- Premium: $51/月 (960个邮箱/月)
- Scale: $69/月 (1,920个邮箱/月)

**特点**:
- ✅ 价格便宜
- ✅ Chrome插件方便
- ✅ 邮箱准确率90%+
- ⚠️ 数据量比Apollo少

**适合**: 小团队、个人

**网址**: https://www.lusha.com/

---

### 4. Hunter.io (邮箱查找专家)

**定价**:
- Free: $0/月 (25次/月)
- Starter: $49/月 (500次/月)
- Growth: $99/月 (2,500次/月)
- Business: $199/月 (10,000次/月)

**特点**:
- ✅ 专注邮箱查找
- ✅ 准确率95%+
- ✅ 提供API
- ❌ 不提供完整联系人数据

**适合**: 已有姓名和公司,只需要找邮箱

**API示例**:
```python
import requests

def find_email_hunter(first_name, last_name, domain):
    url = "https://api.hunter.io/v2/email-finder"
    params = {
        "domain": domain,
        "first_name": first_name,
        "last_name": last_name,
        "api_key": "你的API Key"
    }

    response = requests.get(url, params=params)
    return response.json()

# 查找邮箱
result = find_email_hunter("John", "Doe", "google.com")
print(result['data']['email'])  # john.doe@google.com
```

**网址**: https://hunter.io/

---

### 5. 中国本土数据服务商

#### 企查查/天眼查 (企业数据)
- **数据**: 中国企业工商数据
- **定价**: ¥1,000-5,000/年
- **适合**: 找国内留学机构合作

#### 数据侠 (小红书数据)
- **数据**: 小红书用户数据
- **定价**: ¥0.01-0.05/条
- **适合**: 找小红书上的留学博主

#### 八爪鱼 (通用爬虫)
- **数据**: 任何网站
- **定价**: ¥99-999/月
- **适合**: 自定义抓取

---

## 🚀 集成到GuestSeek

我现在给你写一个Apollo.io的集成模块:

```python
# apollo_integration.py

import requests
from typing import List, Dict, Optional

class ApolloClient:
    """Apollo.io API客户端"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.apollo.io/v1"

    def search_people(
        self,
        keywords: str,
        location: str = "",
        titles: List[str] = None,
        limit: int = 25
    ) -> List[Dict]:
        """
        搜索联系人

        Args:
            keywords: 搜索关键词
            location: 地区
            titles: 职位列表
            limit: 返回数量

        Returns:
            List[Dict]: 联系人列表
        """
        url = f"{self.base_url}/mixed_people/search"
        headers = {"X-Api-Key": self.api_key}

        data = {
            "q_keywords": keywords,
            "page": 1,
            "per_page": limit
        }

        if location:
            data["person_locations"] = [location]

        if titles:
            data["person_titles"] = titles

        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()

            results = response.json()
            people = results.get('people', [])

            # 转换为GuestSeek格式
            leads = []
            for person in people:
                leads.append({
                    'name': person.get('name', ''),
                    'email': person.get('email', ''),
                    'phone': person.get('phone_numbers', [{}])[0].get('raw_number', ''),
                    'title': person.get('title', ''),
                    'company': person.get('organization', {}).get('name', ''),
                    'location': person.get('city', '') + ', ' + person.get('country', ''),
                    'linkedin_url': person.get('linkedin_url', ''),
                    'source': 'apollo.io',
                    'notes': f"职位: {person.get('title', '')}\n公司: {person.get('organization', {}).get('name', '')}"
                })

            return leads

        except Exception as e:
            print(f"Apollo API错误: {e}")
            return []

    def enrich_person(self, email: str) -> Optional[Dict]:
        """
        根据邮箱丰富联系人信息

        Args:
            email: 邮箱地址

        Returns:
            Dict: 联系人详细信息
        """
        url = f"{self.base_url}/people/match"
        headers = {"X-Api-Key": self.api_key}

        data = {"email": email}

        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()

            return response.json().get('person')

        except Exception as e:
            print(f"Apollo API错误: {e}")
            return None


# 使用示例
if __name__ == "__main__":
    # 初始化客户端
    client = ApolloClient(api_key="你的API Key")

    # 搜索留学顾问
    leads = client.search_people(
        keywords="study abroad consultant",
        location="United States",
        titles=["Education Consultant", "Study Abroad Advisor"],
        limit=10
    )

    print(f"找到 {len(leads)} 个潜在客户")

    for lead in leads:
        print(f"- {lead['name']} ({lead['email']}) - {lead['company']}")
```

---

## 💰 成本对比

### 自己抓取
- 开发成本: 2-3周
- 服务器: ¥100/月
- 维护成本: 每月5-10小时
- 被封风险: 高
- **总成本**: ¥500-1000/月 + 大量时间

### 购买数据
- Apollo.io: $49/月 (1,200个邮箱)
- Hunter.io: $49/月 (500次查找)
- **总成本**: ¥700/月,零维护

**结论**: 买数据更划算!

---

## 🎯 推荐方案

### 方案A: 小预算 (¥350/月)
- Apollo.io Free (50个邮箱/月)
- Hunter.io Free (25次/月)
- Streamlit Cloud (免费部署)
- **适合**: 个人、小团队

### 方案B: 中预算 (¥700/月)
- Apollo.io Basic ($49/月, 1,200个邮箱)
- Hunter.io Starter ($49/月, 500次)
- Streamlit Cloud (免费部署)
- **适合**: 中小留学机构

### 方案C: 大预算 (¥2,000/月)
- Apollo.io Professional ($79/月, 12,000个邮箱)
- Hunter.io Growth ($99/月, 2,500次)
- Railway ($20/月, 支持Selenium)
- **适合**: 大型留学机构

---

## ✅ 下一步

1. **注册Apollo.io** - 先用免费版测试
2. **获取API Key** - 在设置里生成
3. **集成到GuestSeek** - 我帮你写代码
4. **部署到Streamlit Cloud** - 5分钟搞定

**要我现在帮你集成Apollo.io吗?**
