# 微博爬虫技术文档

## 架构设计

### 核心类: WeiboScraper

```
WeiboScraper
├── init_driver()          # 初始化浏览器
├── manual_login()         # 手动登录
├── search_topic()         # 搜索话题
├── get_weibo_links()      # 获取微博链接
├── scrape_comments()      # 爬取评论
├── extract_comment_info() # 提取评论信息
├── save_to_excel()        # 保存数据
└── run()                  # 主流程
```

## 反爬策略

### 1. undetected-chromedriver
- 自动绕过Cloudflare、Akamai等反爬检测
- 隐藏WebDriver特征
- 模拟真实浏览器行为

### 2. 随机延迟
```python
def random_delay(self, min_seconds=1, max_seconds=3):
    delay = random.uniform(min_seconds, max_seconds)
    time.sleep(delay)
```

### 3. 用户代理伪装
```python
user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) 
AppleWebKit/537.36 (KHTML, like Gecko) 
Chrome/120.0.0.0 Safari/537.36
```

### 4. 禁用自动化特征
```python
options.add_argument('--disable-blink-features=AutomationControlled')
```

## 数据提取流程

### 1. 搜索微博
```
用户输入关键词 
→ 构造搜索URL: https://s.weibo.com/weibo?q={keyword}
→ 等待搜索结果加载
→ 解析微博卡片
```

### 2. 获取微博链接
```
查找所有微博卡片 (div[class*="card-wrap"])
→ 提取详情链接 (a[href*="/detail/"])
→ 去重并存储
→ 滚动加载更多
```

### 3. 爬取评论
```
访问微博详情页
→ 等待评论区加载 (div[class*="CommentItem"])
→ 提取评论信息
→ 滚动加载更多评论
→ 返回评论列表
```

### 4. 提取评论信息
```python
{
    'username': '用户昵称',
    'comment_text': '评论内容',
    'user_homepage': 'https://weibo.com/u/xxx',
    'comment_time': '发布时间',
    'weibo_url': '原微博链接'
}
```

## CSS选择器

### 微博卡片
```css
div[class*="card-wrap"]
```

### 微博链接
```css
a[href*="/detail/"]
a[class*="from"]
```

### 评论元素
```css
div[class*="CommentItem"]
```

### 用户信息
```css
a[class*="head_name"]  /* 用户名和主页 */
div[class*="text"]     /* 评论内容 */
div[class*="time"]     /* 评论时间 */
```

## 错误处理

### 1. 超时处理
```python
try:
    WebDriverWait(self.driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
    )
except TimeoutException:
    self.logger.warning("加载超时")
```

### 2. 元素查找失败
```python
try:
    element = self.driver.find_element(By.CSS_SELECTOR, selector)
except NoSuchElementException:
    # 尝试备用方案
    pass
```

### 3. 过期元素处理
```python
try:
    element.text
except StaleElementReferenceException:
    continue  # 跳过该元素
```

## 性能优化

### 1. 禁用图片加载
```python
prefs = {
    'profile.managed_default_content_settings.images': 2,
    'permissions.default.stylesheet': 2
}
```

### 2. 智能滚动
```python
# 如果评论数量没有增加,停止滚动
if len(comments) == last_comment_count:
    scroll_count += 1
else:
    scroll_count = 0
```

### 3. 批量处理
```python
# 一次性查找所有元素,减少DOM查询
comment_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
```

## 日志系统

### 日志级别
- INFO: 正常流程信息
- WARNING: 警告信息(不影响运行)
- ERROR: 错误信息(影响功能)

### 日志输出
- 控制台: 实时显示
- 文件: weibo_scraper.log

### 日志格式
```
2024-02-22 10:30:45 - INFO - 正在搜索话题: #人工智能#
2024-02-22 10:30:50 - INFO - 找到微博链接 1: https://...
```

## 数据存储

### Excel格式
```python
df = pd.DataFrame(comments_data)
df.to_excel(filename, index=False, engine='openpyxl')
```

### 列顺序
1. 用户名
2. 评论内容
3. 用户主页链接
4. 评论时间
5. 微博链接

## 扩展开发

### 添加新的数据字段
```python
def extract_comment_info(self, element):
    comment_data = {
        'username': '',
        'comment_text': '',
        'user_homepage': '',
        'comment_time': '',
        'weibo_url': '',
        # 添加新字段
        'like_count': '',  # 点赞数
        'reply_count': ''  # 回复数
    }
    # ... 提取逻辑
```

### 添加新的爬取目标
```python
def scrape_user_info(self, user_url):
    """爬取用户详细信息"""
    self.driver.get(user_url)
    # ... 提取用户信息
```

### 添加数据过滤
```python
def filter_comments(self, comments, min_length=10):
    """过滤短评论"""
    return [c for c in comments if len(c['comment_text']) >= min_length]
```

## 常见问题解决

### 1. 登录检测失败
**原因**: 页面结构变化
**解决**: 更新CSS选择器
```python
# 旧: textarea[class*="Form_input"]
# 新: 检查页面实际结构
```

### 2. 评论提取不完整
**原因**: 动态加载延迟
**解决**: 增加等待时间
```python
self.random_delay(3, 5)  # 增加延迟
```

### 3. 数据重复
**原因**: 滚动加载重复元素
**解决**: 添加去重逻辑
```python
if comment_data not in comments:
    comments.append(comment_data)
```

## 最佳实践

1. **控制爬取速度**: 单次不超过100条微博
2. **使用常用账号**: 避免触发验证
3. **定期更新选择器**: 微博页面结构可能变化
4. **保存中间数据**: 防止意外中断
5. **监控日志**: 及时发现问题

## 法律声明

本工具仅供学习研究使用,使用者需遵守:
- 微博平台服务条款
- 《网络安全法》
- 《数据安全法》
- 《个人信息保护法》

禁止用于:
- 商业用途
- 大规模数据采集
- 侵犯用户隐私
- 其他违法行为
