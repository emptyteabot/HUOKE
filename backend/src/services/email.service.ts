import nodemailer from 'nodemailer';
import { prisma } from '../index';

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  userId: string;
  leadId: string;
  campaignId?: string;
}

export class EmailService {
  private static transporter = process.env.SENDGRID_API_KEY
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      })
    : null;

  /**
   * 发送邮件
   */
  static async sendEmail(params: SendEmailParams): Promise<string> {
    const { to, subject, body, userId, leadId, campaignId } = params;

    try {
      // 创建邮件记录
      const email = await prisma.email.create({
        data: {
          userId,
          leadId,
          campaignId,
          subject,
          body,
          status: 'scheduled'
        }
      });

      // 如果没有配置邮件服务,直接标记为已发送(演示模式)
      if (!this.transporter) {
        console.log('📧 演示模式: 邮件未实际发送');
        await prisma.email.update({
          where: { id: email.id },
          data: {
            status: 'sent',
            sentAt: new Date()
          }
        });
        return email.id;
      }

      // 添加追踪像素
      const trackingPixel = `<img src="${process.env.BACKEND_URL}/api/emails/track/${email.id}/open" width="1" height="1" style="display:none" />`;
      const bodyWithTracking = body + trackingPixel;

      // 替换链接为追踪链接
      const bodyWithTrackingLinks = this.addLinkTracking(bodyWithTracking, email.id);

      // 发送邮件
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@leadpulse.ai',
        to,
        subject,
        html: bodyWithTrackingLinks,
        headers: {
          'X-Email-ID': email.id
        }
      });

      // 更新状态
      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: 'sent',
          sentAt: new Date()
        }
      });

      // 更新用户统计
      await prisma.user.update({
        where: { id: userId },
        data: { totalEmails: { increment: 1 } }
      });

      // 记录使用统计
      await prisma.usage.create({
        data: {
          userId,
          emailsSent: 1
        }
      });

      return email.id;
    } catch (error) {
      console.error('Send email error:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * 批量发送邮件
   */
  static async sendBulkEmails(emails: SendEmailParams[]): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const emailParams of emails) {
      try {
        await this.sendEmail(emailParams);
        sent++;

        // 延迟发送（避免被标记为垃圾邮件）
        await this.delay(2000); // 2秒延迟
      } catch (error) {
        failed++;
        console.error('Bulk send error:', error);
      }
    }

    return { sent, failed };
  }

  /**
   * 追踪邮件打开 (增强版 - 包含设备信息)
   */
  static async trackOpen(emailId: string, deviceInfo?: any): Promise<void> {
    try {
      const email = await prisma.email.findUnique({
        where: { id: emailId }
      });

      if (!email) return;

      // 首次打开
      if (!email.openedAt) {
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'opened',
            openedAt: new Date(),
            opens: 1,
            metadata: deviceInfo ? JSON.stringify({
              device: deviceInfo,
              firstOpenedAt: new Date()
            }) : undefined
          }
        });

        // 实时通知: 发送Webhook或WebSocket通知
        await this.sendRealTimeNotification(emailId, 'opened', deviceInfo);
      } else {
        // 多次打开
        await prisma.email.update({
          where: { id: emailId },
          data: {
            opens: { increment: 1 }
          }
        });
      }
    } catch (error) {
      console.error('Track open error:', error);
    }
  }

  /**
   * 追踪阅读时长
   */
  static async trackReadingTime(emailId: string, duration: number): Promise<void> {
    try {
      const email = await prisma.email.findUnique({
        where: { id: emailId }
      });

      if (!email) return;

      const metadata = email.metadata ? JSON.parse(email.metadata as string) : {};
      metadata.readingTime = duration;
      metadata.engagement = duration > 30 ? 'high' : duration > 10 ? 'medium' : 'low';

      await prisma.email.update({
        where: { id: emailId },
        data: {
          metadata: JSON.stringify(metadata)
        }
      });

      // 高参与度通知
      if (duration > 30) {
        await this.sendRealTimeNotification(emailId, 'high_engagement', { duration });
      }
    } catch (error) {
      console.error('Track reading time error:', error);
    }
  }

  /**
   * 追踪链接点击 (增强版)
   */
  static async trackClick(emailId: string, url?: string, deviceInfo?: any): Promise<void> {
    try {
      const email = await prisma.email.findUnique({
        where: { id: emailId }
      });

      if (!email) return;

      // 首次点击
      if (!email.clickedAt) {
        const metadata = email.metadata ? JSON.parse(email.metadata as string) : {};
        metadata.clickedUrl = url;
        metadata.clickDevice = deviceInfo;

        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'clicked',
            clickedAt: new Date(),
            clicks: 1,
            metadata: JSON.stringify(metadata)
          }
        });

        // 实时通知
        await this.sendRealTimeNotification(emailId, 'clicked', { url, device: deviceInfo });
      } else {
        // 多次点击
        await prisma.email.update({
          where: { id: emailId },
          data: {
            clicks: { increment: 1 }
          }
        });
      }
    } catch (error) {
      console.error('Track click error:', error);
    }
  }

  /**
   * 实时通知 (Webhook/WebSocket)
   */
  private static async sendRealTimeNotification(
    emailId: string,
    event: 'opened' | 'clicked' | 'high_engagement',
    data?: any
  ): Promise<void> {
    try {
      const email = await prisma.email.findUnique({
        where: { id: emailId },
        include: {
          lead: true,
          user: true
        }
      });

      if (!email) return;

      const notification = {
        event,
        emailId,
        leadName: email.lead.name,
        leadEmail: email.lead.email,
        subject: email.subject,
        timestamp: new Date(),
        data
      };

      console.log('📬 实时通知:', notification);

      // TODO: 发送到WebSocket或Webhook
      // 可以集成Pusher, Socket.io, 或自定义Webhook
      // await pusher.trigger(`user-${email.userId}`, 'email-event', notification);
    } catch (error) {
      console.error('Send notification error:', error);
    }
  }

  /**
   * 自动跟进
   */
  static async scheduleFollowUp(
    originalEmailId: string,
    followUpDays: number,
    followUpBody: string
  ): Promise<void> {
    try {
      const originalEmail = await prisma.email.findUnique({
        where: { id: originalEmailId },
        include: { lead: true }
      });

      if (!originalEmail) return;

      // 检查是否已回复
      if (originalEmail.status === 'replied') {
        console.log('Email already replied, skipping follow-up');
        return;
      }

      // 计算跟进时间
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + followUpDays);

      // 创建跟进邮件
      await prisma.email.create({
        data: {
          userId: originalEmail.userId,
          leadId: originalEmail.leadId,
          campaignId: originalEmail.campaignId,
          subject: `Re: ${originalEmail.subject}`,
          body: followUpBody,
          status: 'scheduled'
        }
      });

      console.log(`Follow-up scheduled for ${followUpDate}`);
    } catch (error) {
      console.error('Schedule follow-up error:', error);
    }
  }

  /**
   * 添加链接追踪
   */
  private static addLinkTracking(body: string, emailId: string): string {
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi;

    return body.replace(linkRegex, (match, url) => {
      const trackingUrl = `${process.env.BACKEND_URL}/api/emails/track/${emailId}/click?url=${encodeURIComponent(url)}`;
      return match.replace(url, trackingUrl);
    });
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证邮箱地址
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 获取邮件统计
   */
  static async getEmailStats(userId: string): Promise<{
    total: number;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
  }> {
    const emails = await prisma.email.findMany({
      where: { userId }
    });

    const total = emails.length;
    const sent = emails.filter(e => e.status !== 'draft').length;
    const opened = emails.filter(e => e.openedAt !== null).length;
    const clicked = emails.filter(e => e.clickedAt !== null).length;
    const replied = emails.filter(e => e.repliedAt !== null).length;

    return {
      total,
      sent,
      opened,
      clicked,
      replied,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
      clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
      replyRate: sent > 0 ? (replied / sent) * 100 : 0
    };
  }
}