# 微博评论爬虫使用说明

## 功能特性

✅ 使用 undetected-chromedriver 绕过反爬检测
✅ 支持手动登录(扫码/密码)
✅ 自动搜索话题关键词
✅ 批量爬取微博评论
✅ 提取用户名、评论内容、用户主页链接
✅ 随机延迟避免被封
✅ 导出Excel格式数据
✅ 完整的错误处理和日志记录

## 安装依赖

```bash
pip install -r requirements.txt
```

## 使用方法

### 方式1: 交互式运行

```bash
python weibo_scraper.py
```

按提示输入:
- 搜索关键词(例如: #人工智能#)
- 要爬取的微博数量
- 每条微博的评论数量
- 输出文件名(可选)

### 方式2: 代码调用

```python
from weibo_scraper import WeiboScraper

scraper = WeiboScraper(headless=False)
scraper.run(
    keyword='#人工智能#',
    max_posts=5,
    max_comments_per_post=30,
    output_file='my_data.xlsx'
)
```

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| keyword | 搜索关键词 | 必填 |
| max_posts | 爬取微博数量 | 5 |
| max_comments_per_post | 每条微博的评论数 | 30 |
| output_file | 输出文件名 | 自动生成 |
| headless | 无头模式 | False |

## 输出格式

Excel文件包含以下字段:

| 字段 | 说明 |
|------|------|
| 用户名 | 评论者昵称 |
| 评论内容 | 评论文本 |
| 用户主页链接 | 用户个人主页URL |
| 评论时间 | 发布时间 |
| 微博链接 | 原微博URL |

## 注意事项

1. **首次运行**: 需要手动登录微博(扫码或密码),登录后会自动继续
2. **登录状态**: 建议使用常用账号,避免触发验证
3. **爬取速度**: 已设置随机延迟,不要修改太快
4. **数据量**: 建议单次不超过100条微博,避免被限制
5. **Chrome版本**: 程序会自动匹配Chrome版本,无需手动配置

## 常见问题

### Q: 提示"浏览器初始化失败"
A: 确保已安装Chrome浏览器,程序会自动下载对应的驱动

### Q: 登录后没有反应
A: 等待页面完全加载,看到首页发布框后会自动继续

### Q: 爬取到的评论很少
A: 可能是评论区加载慢,可以增加延迟时间或减少爬取数量

### Q: 提示"未找到微博链接"
A: 检查关键词是否正确,或者该话题下微博数量较少

### Q: 导出Excel失败
A: 确保已安装openpyxl: `pip install openpyxl`

## 日志文件

程序运行时会生成 `weibo_scraper.log` 日志文件,记录详细的运行信息和错误。

## 技术实现

- **反爬绕过**: undetected-chromedriver
- **页面解析**: Selenium WebDriver
- **数据导出**: pandas + openpyxl
- **延迟策略**: 随机延迟(1-5秒)
- **错误处理**: 完整的异常捕获和重试机制

## 免责声明

本工具仅供学习研究使用,请遵守微博平台规则,不要用于商业用途或大规模爬取。
