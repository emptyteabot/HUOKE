# 微博爬虫 - 5分钟快速开始

## 第一步: 安装依赖 (1分钟)

```bash
cd scrapers
pip install -r requirements.txt
```

## 第二步: 运行爬虫 (30秒)

### Windows用户
双击运行: `run_weibo_scraper.bat`

### Mac/Linux用户
```bash
python weibo_scraper.py
```

## 第三步: 按提示操作 (3分钟)

### 1. 输入搜索关键词
```
请输入搜索关键词(例如: #人工智能#): #创业#
```

### 2. 设置爬取数量
```
要爬取多少条微博? (默认5条): 3
每条微博爬取多少条评论? (默认30条): 20
```

### 3. 手动登录
- 浏览器会自动打开微博登录页
- 使用扫码或密码登录
- 登录成功后程序自动继续

### 4. 等待爬取完成
```
正在搜索话题: #创业#
找到微博链接 1: https://...
正在爬取评论...
提取评论 1: 张三
提取评论 2: 李四
...
数据已保存到: weibo_comments_20240222_103045.xlsx
```

## 输出结果

Excel文件包含:
- 用户名
- 评论内容
- 用户主页链接
- 评论时间
- 微博链接

## 常见问题

**Q: 提示"未检测到Python"**
A: 安装Python 3.8+: https://www.python.org/downloads/

**Q: 登录后没反应**
A: 等待页面完全加载,看到首页后会自动继续

**Q: 爬取速度慢**
A: 正常现象,已设置随机延迟避免被封

**Q: 评论数量少**
A: 可能是该微博评论本身就少,或者评论区加载慢

## 进阶使用

### 代码调用
```python
from weibo_scraper import WeiboScraper

scraper = WeiboScraper()
scraper.run(
    keyword='#人工智能#',
    max_posts=5,
    max_comments_per_post=30
)
```

### 批量爬取
```python
topics = ['#AI#', '#创业#', '#电商#']
for topic in topics:
    scraper = WeiboScraper()
    scraper.run(keyword=topic, max_posts=3)
```

## 技术支持

- 详细文档: README.md
- 技术文档: WEIBO_TECHNICAL_DOC.md
- 示例代码: example_usage.py
- 日志文件: weibo_scraper.log

## 注意事项

✅ 仅供学习研究使用
✅ 遵守微博平台规则
✅ 不要大规模爬取
✅ 保护用户隐私

开始爬取吧! 🚀
