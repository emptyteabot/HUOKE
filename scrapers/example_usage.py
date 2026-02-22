#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微博爬虫使用示例
"""

from weibo_scraper import WeiboScraper


def example_1_basic():
    """示例1: 基础使用"""
    print("示例1: 基础使用")
    print("-" * 50)
    
    scraper = WeiboScraper(headless=False)
    scraper.run(
        keyword='#人工智能#',
        max_posts=3,
        max_comments_per_post=20,
        output_file='ai_comments.xlsx'
    )


def example_2_multiple_topics():
    """示例2: 爬取多个话题"""
    print("示例2: 爬取多个话题")
    print("-" * 50)
    
    topics = ['#人工智能#', '#机器学习#', '#深度学习#']
    
    for topic in topics:
        print(f"\n正在爬取话题: {topic}")
        scraper = WeiboScraper(headless=False)
        
        # 文件名使用话题名
        filename = f'{topic.replace("#", "")}_comments.xlsx'
        
        scraper.run(
            keyword=topic,
            max_posts=2,
            max_comments_per_post=15,
            output_file=filename
        )


def example_3_large_scale():
    """示例3: 大规模爬取"""
    print("示例3: 大规模爬取")
    print("-" * 50)
    
    scraper = WeiboScraper(headless=False)
    scraper.run(
        keyword='#创业#',
        max_posts=10,
        max_comments_per_post=50,
        output_file='startup_comments_large.xlsx'
    )


def example_4_custom_workflow():
    """示例4: 自定义工作流"""
    print("示例4: 自定义工作流")
    print("-" * 50)
    
    scraper = WeiboScraper(headless=False)
    
    try:
        # 初始化浏览器
        scraper.init_driver()
        
        # 手动登录
        scraper.manual_login(wait_time=120)
        
        # 搜索话题
        scraper.search_topic('#电商#')
        
        # 获取微博链接
        weibo_links = scraper.get_weibo_links(max_posts=5)
        
        # 只爬取前3条微博的评论
        for url in weibo_links[:3]:
            comments = scraper.scrape_comments(url, max_comments=25)
            scraper.comments_data.extend(comments)
        
        # 保存数据
        scraper.save_to_excel('ecommerce_comments.xlsx')
        
    finally:
        scraper.close()


if __name__ == '__main__':
    print("""
╔══════════════════════════════════════════════════════════╗
║           微博爬虫使用示例                               ║
╚══════════════════════════════════════════════════════════╝

请选择要运行的示例:
1. 基础使用 (爬取3条微博,每条20条评论)
2. 爬取多个话题 (批量爬取)
3. 大规模爬取 (10条微博,每条50条评论)
4. 自定义工作流 (完全控制爬取流程)
    """)
    
    choice = input("请输入选项 (1-4): ").strip()
    
    if choice == '1':
        example_1_basic()
    elif choice == '2':
        example_2_multiple_topics()
    elif choice == '3':
        example_3_large_scale()
    elif choice == '4':
        example_4_custom_workflow()
    else:
        print("无效的选项")
