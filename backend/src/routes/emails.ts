import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { EmailService } from '../services/email.service';
import { prisma } from '../index';

const router = Router();

// 追踪端点（无需认证）
router.get('/track/:emailId/open', async (req, res) => {
  const { emailId } = req.params;

  // 提取设备和浏览器信息
  const userAgent = req.headers['user-agent'] || '';
  const deviceInfo = {
    userAgent,
    isMobile: /mobile/i.test(userAgent),
    isDesktop: !/mobile/i.test(userAgent),
    browser: userAgent.includes('Chrome') ? 'Chrome' :
             userAgent.includes('Firefox') ? 'Firefox' :
             userAgent.includes('Safari') ? 'Safari' : 'Other',
    os: userAgent.includes('Windows') ? 'Windows' :
        userAgent.includes('Mac') ? 'Mac' :
        userAgent.includes('Linux') ? 'Linux' :
        userAgent.includes('Android') ? 'Android' :
        userAgent.includes('iOS') ? 'iOS' : 'Other'
  };

  await EmailService.trackOpen(emailId, deviceInfo);

  // 返回1x1透明像素
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(pixel);
});

// 追踪阅读时长
router.post('/track/:emailId/reading-time', async (req, res) => {
  const { emailId } = req.params;
  const { duration } = req.body; // 阅读时长(秒)

  await EmailService.trackReadingTime(emailId, duration);

  res.json({ success: true });
});

router.get('/track/:emailId/click', async (req, res) => {
  const { emailId } = req.params;
  const { url } = req.query;

  // 提取设备信息
  const userAgent = req.headers['user-agent'] || '';
  const deviceInfo = {
    userAgent,
    isMobile: /mobile/i.test(userAgent)
  };

  await EmailService.trackClick(emailId, url as string, deviceInfo);

  // 重定向到原始URL
  res.redirect(url as string);
});

// 以下路由需要认证
router.use(authMiddleware);

// 发送邮件
router.post(
  '/send',
  [
    body('leadId').trim().notEmpty(),
    body('subject').trim().notEmpty(),
    body('body').trim().notEmpty()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;
      const { leadId, subject, body, campaignId } = req.body;

      // 获取潜在客户信息
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, userId }
      });

      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      // 发送邮件
      const emailId = await EmailService.sendEmail({
        to: lead.email,
        subject,
        body,
        userId,
        leadId,
        campaignId
      });

      res.json({
        success: true,
        emailId,
        message: 'Email sent successfully'
      });
    } catch (error) {
      console.error('Send email error:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  }
);

// 批量发送
router.post('/send-bulk', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { leadIds, subject, body, campaignId } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Invalid lead IDs' });
    }

    // 获取所有潜在客户
    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        userId
      }
    });

    // 准备邮件
    const emails = leads.map(lead => ({
      to: lead.email,
      subject,
      body,
      userId,
      leadId: lead.id,
      campaignId
    }));

    // 批量发送
    const result = await EmailService.sendBulkEmails(emails);

    res.json({
      success: true,
      ...result,
      message: `Sent ${result.sent} emails, ${result.failed} failed`
    });
  } catch (error) {
    console.error('Bulk send error:', error);
    res.status(500).json({ error: 'Failed to send bulk emails' });
  }
});

// 获取邮件列表
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { status, leadId, limit = '50', offset = '0' } = req.query;

    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (leadId) {
      where.leadId = leadId;
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        orderBy: { createdAt: 'desc' },
        include: {
          lead: {
            select: {
              name: true,
              email: true,
              company: true
            }
          }
        }
      }),
      prisma.email.count({ where })
    ]);

    res.json({
      emails,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// 获取邮件统计
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const stats = await EmailService.getEmailStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 获取单个邮件
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const email = await prisma.email.findFirst({
      where: { id, userId },
      include: {
        lead: true
      }
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json(email);
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

export default router;