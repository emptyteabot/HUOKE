# 重试装饰器快速参考

## 导入

```python
from retry_decorator import scraper_retry, critical_operation_retry, quick_retry
```

---

## 三种策略

### 1. 标准重试 `@scraper_retry`

**用途**: 一般爬取操作

```python
@scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
def scrape_comments(self, url):
    # 爬取评论
    pass
```

- 最大重试: 3次
- 等待时间: 2-8秒
- 指数退避: 2秒 → 4秒 → 8秒

---

### 2. 关键操作重试 `@critical_operation_retry`

**用途**: 初始化、登录等关键操作

```python
@critical_operation_retry(max_attempts=5)
def init_driver(self):
    # 初始化浏览器
    pass
```

- 最大重试: 5次
- 等待时间: 3-15秒
- 指数退避: 3秒 → 6秒 → 12秒

---

### 3. 快速重试 `@quick_retry`

**用途**: 简单提取、快速操作

```python
@quick_retry(max_attempts=2)
def extract_info(self, element):
    # 提取信息
    pass
```

- 最大重试: 2次
- 等待时间: 1-3秒
- 指数退避: 1秒 → 2秒

---

## 可重试错误

✓ `TimeoutException` - 超时
✓ `NoSuchElementException` - 元素未找到
✓ `StaleElementReferenceException` - 元素过期
✓ `ConnectionError` - 连接错误

---

## 不可重试错误

✗ `KeyboardInterrupt` - 用户中断
✗ `SystemExit` - 系统退出
✗ `MemoryError` - 内存错误

---

## 自定义参数

```python
@scraper_retry(
    max_attempts=5,      # 最多重试5次
    min_wait=3,          # 最小等待3秒
    max_wait=15,         # 最大等待15秒
    multiplier=2         # 指数乘数
)
def custom_scrape(self):
    pass
```

---

## 手动重试

```python
from retry_decorator import retry_on_failure

success, result, error = retry_on_failure(
    func=scrape_function,
    max_attempts=3,
    delay=2,
    url="https://example.com"
)
```

---

## 完整示例

```python
from retry_decorator import scraper_retry, critical_operation_retry, quick_retry

class MyScraper:
    @critical_operation_retry(max_attempts=3)
    def init_driver(self):
        """初始化 - 关键操作"""
        self.driver = uc.Chrome()
        return True

    @scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
    def search(self, keyword):
        """搜索 - 标准重试"""
        self.driver.get(f"https://example.com/search?q={keyword}")
        return True

    @scraper_retry(max_attempts=3, min_wait=2, max_wait=8)
    def scrape_page(self, url):
        """爬取页面 - 标准重试"""
        self.driver.get(url)
        data = self._extract_data()
        return data

    @quick_retry(max_attempts=2)
    def _extract_data(self):
        """提取数据 - 快速重试"""
        element = self.driver.find_element(By.CSS_SELECTOR, ".data")
        return element.text
```

---

## 测试

```bash
# 验证安装
python verify_retry.py

# 运行测试
python test_retry.py
```

---

## 文档

- `ERROR_HANDLING_GUIDE.md` - 详细指南
- `RETRY_UPGRADE_README.md` - 升级说明
- `COMPLETION_SUMMARY.md` - 完成总结

---

## 选择策略

| 操作类型 | 使用策略 | 重试次数 |
|---------|---------|---------|
| 浏览器初始化 | `@critical_operation_retry` | 5次 |
| 登录 | `@critical_operation_retry` | 5次 |
| 搜索 | `@scraper_retry` | 3次 |
| 获取链接 | `@scraper_retry` | 3次 |
| 爬取评论 | `@scraper_retry` | 3次 |
| 提取信息 | `@quick_retry` | 2次 |
| 解析数据 | `@quick_retry` | 2次 |

---

## 日志示例

```
2024-02-22 10:30:15 - INFO - 尝试执行 scrape_comments (第 1/3 次)
2024-02-22 10:30:20 - WARNING - 第 1 次尝试失败: TimeoutException
2024-02-22 10:30:20 - INFO - 等待 2 秒后重试...
2024-02-22 10:30:25 - INFO - ✓ scrape_comments 执行成功
```

---

**快速参考完成!** 🚀
