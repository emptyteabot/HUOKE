import puppeteer, { Browser, Page } from 'puppeteer';
import { prisma } from '../index';

interface LinkedInSearchParams {
  keywords?: string;
  location?: string;
  industry?: string;
  companySize?: string;
  jobTitle?: string;
  limit?: number;
}

interface ScrapedLead {
  name: string;
  jobTitle?: string;
  company: string;
  location?: string;
  linkedinUrl: string;
  profileImageUrl?: string;
}

export class LinkedInScraperService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * 初始化浏览器
   */
  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    this.page = await this.browser.newPage();

    // 设置User Agent
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 设置视口
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  /**
   * 登录LinkedIn
   */
  async login(email: string, password: string): Promise<boolean> {
    if (!this.page) await this.init();

    try {
      await this.page!.goto('https://www.linkedin.com/login', {
        waitUntil: 'networkidle2'
      });

      // 输入邮箱
      await this.page!.type('#username', email, { delay: 100 });

      // 输入密码
      await this.page!.type('#password', password, { delay: 100 });

      // 点击登录
      await this.page!.click('button[type="submit"]');

      // 等待导航
      await this.page!.waitForNavigation({ waitUntil: 'networkidle2' });

      // 检查是否登录成功
      const url = this.page!.url();
      return url.includes('/feed') || url.includes('/in/');
    } catch (error) {
      console.error('LinkedIn login error:', error);
      return false;
    }
  }

  /**
   * 搜索潜在客户
   */
  async searchLeads(params: LinkedInSearchParams, userId: string): Promise<number> {
    if (!this.page) await this.init();

    try {
      const {
        keywords = '',
        location = '',
        jobTitle = '',
        limit = 50
      } = params;

      // 构建搜索URL
      let searchUrl = 'https://www.linkedin.com/search/results/people/?';

      if (keywords) {
        searchUrl += `keywords=${encodeURIComponent(keywords)}&`;
      }

      if (location) {
        searchUrl += `geoUrn=${encodeURIComponent(location)}&`;
      }

      if (jobTitle) {
        searchUrl += `title=${encodeURIComponent(jobTitle)}&`;
      }

      console.log('Searching LinkedIn:', searchUrl);

      await this.page!.goto(searchUrl, { waitUntil: 'networkidle2' });

      // 等待搜索结果加载
      await this.page!.waitForSelector('.search-results-container', { timeout: 10000 });

      const leads: ScrapedLead[] = [];
      let currentPage = 1;
      const maxPages = Math.ceil(limit / 10); // LinkedIn每页约10个结果

      while (leads.length < limit && currentPage <= maxPages) {
        // 滚动加载更多结果
        await this.autoScroll();

        // 提取当前页面的潜在客户
        const pageLeads = await this.page!.evaluate(() => {
          const results: ScrapedLead[] = [];
          const items = document.querySelectorAll('.reusable-search__result-container');

          items.forEach(item => {
            try {
              const nameElement = item.querySelector('.entity-result__title-text a');
              const titleElement = item.querySelector('.entity-result__primary-subtitle');
              const companyElement = item.querySelector('.entity-result__secondary-subtitle');
              const locationElement = item.querySelector('.entity-result__location');
              const imageElement = item.querySelector('img.presence-entity__image');

              if (nameElement && companyElement) {
                results.push({
                  name: nameElement.textContent?.trim() || '',
                  jobTitle: titleElement?.textContent?.trim(),
                  company: companyElement.textContent?.trim() || '',
                  location: locationElement?.textContent?.trim(),
                  linkedinUrl: (nameElement as HTMLAnchorElement).href,
                  profileImageUrl: (imageElement as HTMLImageElement)?.src
                });
              }
            } catch (error) {
              console.error('Parse item error:', error);
            }
          });

          return results;
        });

        leads.push(...pageLeads);

        // 点击下一页
        if (leads.length < limit && currentPage < maxPages) {
          try {
            const nextButton = await this.page!.$('button[aria-label="Next"]');
            if (nextButton) {
              await nextButton.click();
              await this.page!.waitForTimeout(2000); // 等待加载
              currentPage++;
            } else {
              break; // 没有下一页了
            }
          } catch (error) {
            break; // 无法点击下一页
          }
        } else {
          break;
        }
      }

      // 保存到数据库
      let savedCount = 0;

      for (const lead of leads.slice(0, limit)) {
        try {
          // 检查是否已存在
          const existing = await prisma.lead.findFirst({
            where: {
              userId,
              email: lead.linkedinUrl // 临时用LinkedIn URL作为唯一标识
            }
          });

          if (!existing) {
            await prisma.lead.create({
              data: {
                userId,
                name: lead.name,
                email: `${lead.name.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`, // 占位邮箱
                company: lead.company,
                jobTitle: lead.jobTitle,
                location: lead.location,
                linkedinUrl: lead.linkedinUrl,
                source: 'linkedin',
                status: 'new'
              }
            });

            savedCount++;
          }
        } catch (error) {
          console.error('Save lead error:', error);
        }
      }

      // 更新用户统计
      await prisma.user.update({
        where: { id: userId },
        data: { totalLeads: { increment: savedCount } }
      });

      // 记录使用统计
      await prisma.usage.create({
        data: {
          userId,
          leadsGenerated: savedCount
        }
      });

      return savedCount;
    } catch (error) {
      console.error('Search leads error:', error);
      throw new Error('Failed to search LinkedIn');
    }
  }

  /**
   * 获取个人资料详情
   */
  async getProfileDetails(profileUrl: string): Promise<any> {
    if (!this.page) await this.init();

    try {
      await this.page!.goto(profileUrl, { waitUntil: 'networkidle2' });

      const details = await this.page!.evaluate(() => {
        const getTextContent = (selector: string) => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || '';
        };

        return {
          name: getTextContent('h1.text-heading-xlarge'),
          headline: getTextContent('.text-body-medium'),
          location: getTextContent('.text-body-small.inline'),
          about: getTextContent('#about + div .inline-show-more-text'),
          experience: Array.from(document.querySelectorAll('#experience + div li')).map(item => ({
            title: item.querySelector('.mr1')?.textContent?.trim(),
            company: item.querySelector('.t-14')?.textContent?.trim(),
            duration: item.querySelector('.t-black--light')?.textContent?.trim()
          })),
          education: Array.from(document.querySelectorAll('#education + div li')).map(item => ({
            school: item.querySelector('.mr1')?.textContent?.trim(),
            degree: item.querySelector('.t-14')?.textContent?.trim()
          }))
        };
      });

      return details;
    } catch (error) {
      console.error('Get profile details error:', error);
      return null;
    }
  }

  /**
   * 自动滚动页面
   */
  private async autoScroll(): Promise<void> {
    if (!this.page) return;

    await this.page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例
export const linkedInScraper = new LinkedInScraperService();