# 爬虫错误处理与重试机制指南

## 概述

本文档说明LeadPulse爬虫系统的错误处理和自动重试机制。

## 重试装饰器

### 1. `@scraper_retry` - 标准重试

用于一般爬取操作,如获取链接、爬取评论等。

```python
@scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
def scrape_comments(self, url):
    # 爬取逻辑
    pass
```

**参数:**
- `max_attempts`: 最大重试次数 (默认3次)
- `min_wait`: 最小等待时间 (默认2秒)
- `max_wait`: 最大等待时间 (默认8秒)
- 使用指数退避策略

**适用场景:**
- 爬取评论
- 获取链接列表
- 搜索操作
- 页面加载

---

### 2. `@critical_operation_retry` - 关键操作重试

用于关键操作,采用更激进的重试策略。

```python
@critical_operation_retry(max_attempts=5)
def init_driver(self):
    # 初始化浏览器
    pass
```

**参数:**
- `max_attempts`: 最大重试次数 (默认5次)
- `min_wait`: 3秒
- `max_wait`: 15秒
- 指数退避乘数: 2

**适用场景:**
- 浏览器初始化
- 登录操作
- 数据库连接
- 关键配置加载

---

### 3. `@quick_retry` - 快速重试

用于简单操作,快速失败。

```python
@quick_retry(max_attempts=2)
def extract_comment_info(self, element):
    # 提取信息
    pass
```

**参数:**
- `max_attempts`: 最大重试次数 (默认2次)
- `min_wait`: 1秒
- `max_wait`: 3秒

**适用场景:**
- 元素信息提取
- 简单数据解析
- 快速验证操作

---

## 错误分类

### 可重试错误 (Retryable)

这些错误是临时性的,重试可能成功:

| 错误类型 | 说明 | 重试策略 |
|---------|------|---------|
| `TimeoutException` | 页面加载超时 | 指数退避重试 |
| `NoSuchElementException` | 元素未找到 | 等待后重试 |
| `StaleElementReferenceException` | 元素过期 | 立即重试 |
| `ElementClickInterceptedException` | 点击被拦截 | 等待后重试 |
| `ElementNotInteractableException` | 元素不可交互 | 等待后重试 |
| `ConnectionError` | 网络连接错误 | 指数退避重试 |
| `ConnectionResetError` | 连接重置 | 指数退避重试 |

### 不可重试错误 (Non-Retryable)

这些错误是致命的,重试无意义:

| 错误类型 | 说明 | 处理方式 |
|---------|------|---------|
| `KeyboardInterrupt` | 用户中断 | 立即停止 |
| `SystemExit` | 系统退出 | 立即停止 |
| `MemoryError` | 内存不足 | 立即停止 |
| 账号被封 | 反爬检测 | 记录日志,停止 |
| 验证码 | 需要人工介入 | 通知用户 |
| 登录失效 | 需要重新登录 | 提示用户 |

---

## 使用示例

### 微博爬虫

```python
from retry_decorator import scraper_retry, critical_operation_retry, quick_retry

class WeiboScraper:
    @critical_operation_retry(max_attempts=3)
    def init_driver(self):
        """初始化浏览器 - 关键操作"""
        self.driver = uc.Chrome(options=options)
        return True

    @scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
    def search_topic(self, keyword):
        """搜索话题 - 标准重试"""
        self.driver.get(search_url)
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'div[class*="card-wrap"]'))
        )
        return True

    @scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
    def get_weibo_links(self, max_posts=10):
        """获取微博链接 - 标准重试"""
        weibo_links = []
        # 爬取逻辑
        return weibo_links

    @scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
    def scrape_comments(self, weibo_url, max_comments=50):
        """爬取评论 - 标准重试"""
        comments = []
        # 爬取逻辑
        return comments

    @quick_retry(max_attempts=2)
    def extract_comment_info(self, element):
        """提取评论信息 - 快速重试"""
        comment_data = {}
        # 提取逻辑
        return comment_data
```

### 小红书爬虫

```python
class XiaohongshuScraper:
    @critical_operation_retry(max_attempts=3)
    def init_driver(self):
        """初始化浏览器"""
        self.driver = uc.Chrome(options=options)
        return True

    @scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
    def search_keyword(self, keyword):
        """搜索关键词"""
        self.driver.get(search_url)
        return True

    @scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
    def get_note_links(self, max_notes=10):
        """获取笔记链接"""
        note_links = []
        return note_links

    @scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
    def extract_comments(self, note_url, max_comments=50):
        """提取评论"""
        # 爬取逻辑
        pass

    @quick_retry(max_attempts=2)
    def _extract_current_comments(self, note_url):
        """提取当前页面评论"""
        # 提取逻辑
        return count
```

### 知乎爬虫

```python
class ZhihuScraper:
    @critical_operation_retry(max_attempts=3)
    def init_driver(self):
        """初始化浏览器"""
        self.driver = uc.Chrome(options=options)
        return True

    @scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
    def search_question(self, keyword):
        """搜索问题"""
        self.driver.get(search_url)
        return question_url

    @scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
    def scrape_question(self, question_url, max_answers=10):
        """爬取问题"""
        # 爬取逻辑
        return count

    @quick_retry(max_attempts=2)
    def extract_answer_data(self, item, question_title, question_url):
        """提取回答数据"""
        answer_data = {}
        return answer_data

    @quick_retry(max_attempts=2)
    def extract_comment_data(self, comment_item, question_title, question_url):
        """提取评论数据"""
        comment_data = {}
        return comment_data
```

---

## 手动重试

对于不适合装饰器的场景,可以使用手动重试:

```python
from retry_decorator import retry_on_failure

def scrape_with_manual_retry():
    success, result, error = retry_on_failure(
        func=some_function,
        max_attempts=3,
        delay=2,
        arg1="value1",
        arg2="value2"
    )

    if success:
        print(f"成功: {result}")
    else:
        print(f"失败: {error}")
```

---

## 重试上下文管理器

用于需要自定义重试逻辑的场景:

```python
from retry_decorator import RetryContext

def scrape_with_context():
    ctx = RetryContext("爬取操作", max_attempts=3)

    while ctx.should_retry():
        with ctx:
            # 执行操作
            result = perform_scraping()
            break  # 成功则退出
```

---

## 日志记录

重试机制会自动记录以下信息:

1. **重试前**: 记录失败原因和等待时间
2. **重试后**: 记录重试结果
3. **最终失败**: 记录达到最大重试次数

日志格式:
```
2024-02-22 10:30:15 - retry_decorator - INFO - 尝试执行 scrape_comments (第 1/3 次)
2024-02-22 10:30:20 - retry_decorator - WARNING - 第 1 次尝试失败: TimeoutException
2024-02-22 10:30:20 - retry_decorator - INFO - 等待 2 秒后重试...
2024-02-22 10:30:25 - retry_decorator - INFO - ✓ scrape_comments 执行成功
```

---

## 最佳实践

### 1. 选择合适的重试策略

- **关键操作** (初始化、登录): 使用 `@critical_operation_retry`
- **一般爬取** (获取数据、搜索): 使用 `@scraper_retry`
- **简单提取** (解析元素): 使用 `@quick_retry`

### 2. 设置合理的重试次数

- 网络操作: 3-5次
- 元素查找: 2-3次
- 简单解析: 1-2次

### 3. 使用指数退避

避免频繁重试导致被封:
- 第1次: 等待2秒
- 第2次: 等待4秒
- 第3次: 等待8秒

### 4. 记录详细日志

```python
self.logger.info(f"开始爬取: {url}")
self.logger.warning(f"重试中: {attempt}/{max_attempts}")
self.logger.error(f"最终失败: {error}")
```

### 5. 优雅降级

```python
@scraper_retry(max_attempts=3)
def scrape_comments(self, url):
    try:
        comments = self._scrape_with_method_1(url)
    except Exception:
        # 降级到备用方法
        comments = self._scrape_with_method_2(url)
    return comments
```

### 6. 避免无限重试

始终设置 `max_attempts`,避免死循环。

### 7. 区分错误类型

```python
try:
    result = scrape_data()
except (TimeoutException, NoSuchElementException):
    # 可重试错误 - 自动重试
    raise
except KeyboardInterrupt:
    # 不可重试错误 - 立即停止
    logger.error("用户中断")
    sys.exit(0)
```

---

## 性能优化

### 1. 减少不必要的重试

```python
# 不好: 每个小操作都重试
@scraper_retry(max_attempts=3)
def get_text(element):
    return element.text

# 好: 只在关键操作重试
@scraper_retry(max_attempts=3)
def scrape_page(url):
    # 包含多个小操作
    pass
```

### 2. 使用快速失败

对于明确失败的情况,不要重试:

```python
if not self.driver:
    raise RuntimeError("浏览器未初始化")  # 不重试
```

### 3. 并行重试

对于独立的操作,可以并行重试:

```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = [executor.submit(scrape_url, url) for url in urls]
    results = [f.result() for f in futures]
```

---

## 故障排查

### 问题1: 重试次数过多

**症状**: 爬虫运行缓慢,日志显示大量重试

**解决方案**:
1. 检查网络连接
2. 增加等待时间
3. 优化选择器
4. 检查反爬机制

### 问题2: 重试无效

**症状**: 重试后仍然失败

**解决方案**:
1. 确认错误类型是否可重试
2. 检查是否需要人工介入 (验证码、登录)
3. 增加重试间隔
4. 使用备用方案

### 问题3: 内存泄漏

**症状**: 长时间运行后内存占用过高

**解决方案**:
1. 及时关闭浏览器
2. 清理缓存数据
3. 限制并发数量
4. 定期重启driver

---

## 监控与告警

### 1. 重试率监控

```python
class ScraperMetrics:
    def __init__(self):
        self.total_attempts = 0
        self.retry_count = 0

    def record_retry(self):
        self.retry_count += 1

    def get_retry_rate(self):
        return self.retry_count / self.total_attempts if self.total_attempts > 0 else 0
```

### 2. 失败告警

```python
if retry_rate > 0.5:  # 重试率超过50%
    send_alert("爬虫重试率过高,请检查")
```

### 3. 性能指标

- 平均重试次数
- 成功率
- 平均响应时间
- 错误类型分布

---

## 总结

1. **使用装饰器**: 简化重试逻辑
2. **分类错误**: 区分可重试和不可重试
3. **指数退避**: 避免频繁请求
4. **记录日志**: 便于排查问题
5. **优雅降级**: 提供备用方案
6. **监控告警**: 及时发现问题

通过完善的重试机制,LeadPulse爬虫系统能够:
- 提高稳定性和成功率
- 减少人工干预
- 优雅处理临时故障
- 提供更好的用户体验
