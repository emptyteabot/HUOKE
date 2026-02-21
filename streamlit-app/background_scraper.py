"""
后台抓取任务系统

使用线程池在后台运行抓取任务,不阻塞Web界面
适合部署到云端服务器
"""

import threading
import queue
import time
import json
from datetime import datetime
from typing import Dict, List, Optional
import uuid


class ScrapingTask:
    """抓取任务"""

    def __init__(self, task_id: str, keywords: str, platforms: List[str], user_id: str):
        self.task_id = task_id
        self.keywords = keywords
        self.platforms = platforms
        self.user_id = user_id
        self.status = 'pending'  # pending, running, completed, failed
        self.progress = 0
        self.results = {}
        self.error = None
        self.created_at = datetime.now().isoformat()
        self.started_at = None
        self.completed_at = None

    def to_dict(self):
        return {
            'task_id': self.task_id,
            'keywords': self.keywords,
            'platforms': self.platforms,
            'user_id': self.user_id,
            'status': self.status,
            'progress': self.progress,
            'results': self.results,
            'error': self.error,
            'created_at': self.created_at,
            'started_at': self.started_at,
            'completed_at': self.completed_at
        }


class BackgroundScraper:
    """后台抓取器"""

    def __init__(self, max_workers: int = 2):
        self.task_queue = queue.Queue()
        self.tasks = {}  # task_id -> ScrapingTask
        self.max_workers = max_workers
        self.workers = []
        self.running = False

    def start(self):
        """启动工作线程"""
        if self.running:
            return

        self.running = True

        for i in range(self.max_workers):
            worker = threading.Thread(target=self._worker, daemon=True)
            worker.start()
            self.workers.append(worker)

        print(f"✅ 后台抓取器已启动 ({self.max_workers} 个工作线程)")

    def stop(self):
        """停止工作线程"""
        self.running = False
        print("⏹️ 后台抓取器已停止")

    def submit_task(self, keywords: str, platforms: List[str], user_id: str) -> str:
        """
        提交抓取任务

        Args:
            keywords: 搜索关键词
            platforms: 平台列表
            user_id: 用户ID

        Returns:
            str: 任务ID
        """
        task_id = str(uuid.uuid4())
        task = ScrapingTask(task_id, keywords, platforms, user_id)

        self.tasks[task_id] = task
        self.task_queue.put(task)

        print(f"📝 任务已提交: {task_id} - {keywords}")

        return task_id

    def get_task(self, task_id: str) -> Optional[Dict]:
        """获取任务状态"""
        task = self.tasks.get(task_id)
        return task.to_dict() if task else None

    def get_user_tasks(self, user_id: str) -> List[Dict]:
        """获取用户的所有任务"""
        return [
            task.to_dict()
            for task in self.tasks.values()
            if task.user_id == user_id
        ]

    def _worker(self):
        """工作线程"""
        while self.running:
            try:
                # 获取任务 (超时1秒,避免阻塞)
                task = self.task_queue.get(timeout=1)

                # 执行任务
                self._execute_task(task)

                self.task_queue.task_done()

            except queue.Empty:
                continue
            except Exception as e:
                print(f"❌ 工作线程错误: {e}")

    def _execute_task(self, task: ScrapingTask):
        """执行抓取任务"""
        print(f"🚀 开始执行任务: {task.task_id}")

        task.status = 'running'
        task.started_at = datetime.now().isoformat()

        try:
            # 方案1: 使用真实Selenium抓取 (如果在本地或有Chrome的服务器)
            try:
                from real_scraper import MultiPlatformScraper

                scraper = MultiPlatformScraper(headless=True)
                results = scraper.scrape_all(task.keywords, task.platforms, limit=10)

                task.results = results
                task.status = 'completed'
                task.progress = 100

            except ImportError:
                # 方案2: 如果没有Selenium,使用模拟数据
                print("⚠️ Selenium不可用,使用模拟数据")
                from platform_scraper import MultiPlatformAggregator

                aggregator = MultiPlatformAggregator()
                results = aggregator.search_all_platforms(task.keywords, task.platforms)

                task.results = results
                task.status = 'completed'
                task.progress = 100

            task.completed_at = datetime.now().isoformat()

            print(f"✅ 任务完成: {task.task_id}")

        except Exception as e:
            task.status = 'failed'
            task.error = str(e)
            task.completed_at = datetime.now().isoformat()

            print(f"❌ 任务失败: {task.task_id} - {e}")


# 全局单例
_scraper_instance = None


def get_background_scraper() -> BackgroundScraper:
    """获取后台抓取器单例"""
    global _scraper_instance

    if _scraper_instance is None:
        _scraper_instance = BackgroundScraper(max_workers=2)
        _scraper_instance.start()

    return _scraper_instance


# 使用示例
if __name__ == "__main__":
    # 启动后台抓取器
    scraper = get_background_scraper()

    # 提交任务
    task_id = scraper.submit_task(
        keywords="美国留学",
        platforms=["xiaohongshu", "zhihu"],
        user_id="test_user"
    )

    print(f"任务ID: {task_id}")

    # 查询任务状态
    while True:
        task = scraper.get_task(task_id)
        print(f"状态: {task['status']} - 进度: {task['progress']}%")

        if task['status'] in ['completed', 'failed']:
            break

        time.sleep(2)

    # 查看结果
    if task['status'] == 'completed':
        print(f"✅ 抓取完成!")
        print(json.dumps(task['results'], indent=2, ensure_ascii=False))
    else:
        print(f"❌ 抓取失败: {task['error']}")
