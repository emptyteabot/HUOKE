import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AIService } from '../services/ai.service';
import { prisma } from '../index';

const router = Router();

// 所有路由需要认证
router.use(authMiddleware);

// 生成邮件
router.post(
  '/generate-email',
  [
    body('recipientName').trim().notEmpty(),
    body('recipientCompany').trim().notEmpty(),
    body('productName').trim().notEmpty(),
    body('valueProposition').trim().notEmpty()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = req.user;

      // 检查额度
      if (user.plan === 'free' && user.credits <= 0) {
        return res.status(403).json({
          error: 'No credits remaining',
          message: '免费额度已用完，请升级套餐'
        });
      }

      const {
        recipientName,
        recipientCompany,
        recipientTitle,
        painPoint,
        productName,
        valueProposition,
        caseStudy,
        tone,
        length
      } = req.body;

      // 调用AI生成邮件
      const generatedEmail = await AIService.generateEmail({
        recipientName,
        recipientCompany,
        recipientTitle,
        painPoint,
        productName,
        valueProposition,
        caseStudy,
        tone,
        length
      });

      // 扣除额度（免费用户）
      if (user.plan === 'free') {
        await prisma.user.update({
          where: { id: user.id },
          data: { credits: { decrement: 1 } }
        });
      }

      // 记录使用统计
      await prisma.usage.create({
        data: {
          userId: user.id,
          aiCalls: 1
        }
      });

      res.json({
        ...generatedEmail,
        creditsRemaining: user.plan === 'free' ? user.credits - 1 : null
      });
    } catch (error) {
      console.error('Generate email error:', error);
      res.status(500).json({ error: 'Failed to generate email' });
    }
  }
);

// 优化主题行
router.post(
  '/optimize-subject',
  [body('subject').trim().notEmpty()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { subject } = req.body;

      const optimizedSubjects = await AIService.optimizeSubject(subject);

      res.json({ subjects: optimizedSubjects });
    } catch (error) {
      console.error('Optimize subject error:', error);
      res.status(500).json({ error: 'Failed to optimize subject' });
    }
  }
);

// 分析潜在客户
router.post(
  '/analyze-lead',
  [body('leadId').trim().notEmpty()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { leadId } = req.body;
      const userId = req.userId!;

      // 获取潜在客户信息
      const lead = await prisma.lead.findFirst({
        where: {
          id: leadId,
          userId
        }
      });

      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      // 分析相关性（这里简化，实际应该从用户配置获取目标画像）
      const analysis = await AIService.analyzeLeadRelevance(
        {
          company: lead.company,
          jobTitle: lead.jobTitle || undefined,
          industry: lead.industry || undefined,
          companySize: lead.companySize || undefined
        },
        {
          targetIndustries: ['SaaS', 'Technology'],
          targetTitles: ['CEO', 'Founder', 'VP Sales'],
          targetCompanySize: ['11-50', '51-200']
        }
      );

      // 更新潜在客户评分
      await prisma.lead.update({
        where: { id: leadId },
        data: { relevanceScore: analysis.score }
      });

      res.json(analysis);
    } catch (error) {
      console.error('Analyze lead error:', error);
      res.status(500).json({ error: 'Failed to analyze lead' });
    }
  }
);

export default router;