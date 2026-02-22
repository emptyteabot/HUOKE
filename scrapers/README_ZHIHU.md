# 知乎爬虫使用说明

## 功能特点

✅ 使用 undetected-chromedriver 绕过反爬检测
✅ 支持手动登录,安全可靠
✅ 自动搜索问题并爬取回答
✅ 爬取回答下的评论
✅ 提取用户名、内容、用户主页链接
✅ 随机延迟避免被封
✅ 导出Excel格式数据

## 安装依赖

```bash
pip install undetected-chromedriver selenium pandas openpyxl
```

## 使用步骤

### 1. 运行程序

```bash
python zhihu_scraper.py
```

### 2. 手动登录

- 程序会自动打开知乎登录页面
- 在浏览器中完成登录(扫码或密码登录)
- 登录成功后,在控制台输入 `y` 继续

### 3. 输入搜索关键词

```
请输入搜索关键词: Python爬虫
```

### 4. 设置爬取数量

```
请输入要爬取的回答数量 (默认10): 20
```

### 5. 等待爬取完成

程序会自动:
- 搜索问题
- 爬取回答
- 爬取评论
- 显示实时进度

### 6. 导出数据

```
请输入导出文件名 (直接回车使用默认名称):
```

默认文件名格式: `知乎数据_20260222_143025.xlsx`

## 输出数据格式

Excel文件包含以下字段:

| 字段 | 说明 |
|------|------|
| 类型 | 回答/评论 |
| 问题标题 | 问题的标题 |
| 用户名 | 发布者用户名 |
| 用户主页 | 用户主页链接 |
| 内容 | 回答或评论内容 |
| 点赞数 | 点赞数量 |
| 问题链接 | 问题URL |
| 爬取时间 | 数据爬取时间 |

## 注意事项

### 1. Chrome版本

程序使用 Chrome 120 版本,如果你的Chrome版本不同:

```python
# 修改这一行的 version_main 参数
self.driver = uc.Chrome(options=options, version_main=120)
```

查看Chrome版本: 打开Chrome -> 设置 -> 关于Chrome

### 2. 爬取速度

- 程序内置随机延迟(1-5秒)
- 不要设置过大的爬取数量
- 建议每次爬取不超过50条回答

### 3. 登录状态

- 每次运行都需要重新登录
- 如果需要保持登录,可以修改代码保存cookies

### 4. 反爬应对

如果遇到验证码或限制:
- 减少爬取数量
- 增加延迟时间
- 更换IP地址
- 等待一段时间后再试

## 常见问题

### Q1: 提示 "chromedriver 下载失败"

**解决方法:**
1. 手动下载 chromedriver: https://chromedriver.chromium.org/
2. 放到系统PATH路径下
3. 或者指定路径:
```python
self.driver = uc.Chrome(driver_executable_path="路径/chromedriver.exe")
```

### Q2: 爬取到的数据为空

**可能原因:**
- 页面结构变化
- 网络问题
- 被反爬拦截

**解决方法:**
- 检查网络连接
- 手动访问知乎确认能否正常访问
- 更新CSS选择器

### Q3: 程序卡住不动

**解决方法:**
- 按 Ctrl+C 中断程序
- 检查浏览器是否弹出验证码
- 增加等待时间

### Q4: Excel导出失败

**解决方法:**
- 确保安装了 openpyxl: `pip install openpyxl`
- 检查文件名是否包含非法字符
- 确保有写入权限

## 高级用法

### 1. 批量爬取多个问题

修改 `main()` 函数:

```python
keywords = ["Python爬虫", "数据分析", "机器学习"]
for keyword in keywords:
    question_url = scraper.search_question(keyword)
    if question_url:
        scraper.scrape_question(question_url, max_answers=10)
```

### 2. 保存登录状态

在登录成功后保存cookies:

```python
import pickle

# 保存cookies
with open("zhihu_cookies.pkl", "wb") as f:
    pickle.dump(self.driver.get_cookies(), f)

# 加载cookies
with open("zhihu_cookies.pkl", "rb") as f:
    cookies = pickle.load(f)
    for cookie in cookies:
        self.driver.add_cookie(cookie)
```

### 3. 爬取指定问题

直接提供问题URL:

```python
question_url = "https://www.zhihu.com/question/123456789"
scraper.scrape_question(question_url, max_answers=20)
```

### 4. 自定义延迟时间

修改 `random_delay()` 调用:

```python
# 更长的延迟
self.random_delay(3, 6)

# 更短的延迟(不推荐)
self.random_delay(0.5, 1)
```

## 技术细节

### CSS选择器

程序使用的主要选择器:

```python
# 搜索结果
"h2.ContentItem-title a"

# 回答列表
"div.List-item"

# 用户名
"a.UserLink-link"

# 回答内容
"div.RichContent-inner"

# 评论
"div.CommentItem"
```

如果知乎更新页面结构,需要更新这些选择器。

### 反爬机制

undetected-chromedriver 的工作原理:
- 移除 webdriver 特征
- 模拟真实用户行为
- 随机化浏览器指纹

## 免责声明

本工具仅供学习研究使用,请遵守知乎的使用条款和robots.txt规则。

- 不要过度爬取
- 不要用于商业用途
- 尊重用户隐私
- 遵守相关法律法规

## 更新日志

### v1.0 (2026-02-22)
- 初始版本
- 支持搜索和爬取
- 支持导出Excel
- 完整错误处理

## 联系方式

如有问题或建议,请提交Issue。
