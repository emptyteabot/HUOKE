# 🚀 微博爬虫 - 从这里开始

## 第一步: 测试环境

运行测试脚本,确保环境正常:

```bash
python test_weibo.py
```

如果提示缺少依赖,运行:

```bash
pip install -r requirements.txt
```

## 第二步: 运行爬虫

### Windows用户
双击运行: `run_weibo_scraper.bat`

### Mac/Linux用户
```bash
python weibo_scraper.py
```

## 第三步: 按提示操作

1. 输入关键词: `#人工智能#`
2. 设置数量: 微博5条,评论30条
3. 手动登录微博(扫码或密码)
4. 等待爬取完成

## 输出结果

生成Excel文件,包含:
- 用户名
- 评论内容
- 用户主页链接
- 评论时间
- 微博链接

## 📚 文档导航

| 文档 | 说明 |
|------|------|
| `QUICKSTART_WEIBO.md` | 5分钟快速开始 |
| `微博爬虫使用指南.md` | 完整使用指南 |
| `README.md` | 详细说明文档 |
| `WEIBO_TECHNICAL_DOC.md` | 技术文档 |
| `example_usage.py` | 代码示例 |

## ⚡ 快速示例

```python
from weibo_scraper import WeiboScraper

scraper = WeiboScraper()
scraper.run(
    keyword='#创业#',
    max_posts=5,
    max_comments_per_post=30
)
```

## 🎯 核心功能

✅ undetected-chromedriver 绕过反爬
✅ 手动登录支持
✅ 自动搜索话题
✅ 批量爬取评论
✅ 提取用户信息
✅ 随机延迟保护
✅ Excel导出
✅ 完整错误处理

## ❓ 遇到问题?

1. 查看日志: `weibo_scraper.log`
2. 阅读FAQ: `README.md`
3. 运行测试: `python test_weibo.py`

## ⚠️ 重要提示

- 仅供学习研究使用
- 遵守微博平台规则
- 不要大规模爬取
- 保护用户隐私

开始使用吧! 🎉
