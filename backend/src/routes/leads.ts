import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();
router.use(authMiddleware);

// 获取所有潜在客户
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { status, search, limit = '50', offset = '0' } = req.query;

    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { emails: true }
          }
        }
      }),
      prisma.lead.count({ where })
    ]);

    res.json({
      leads,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// 创建潜在客户
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('company').trim().notEmpty()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;
      const {
        name,
        email,
        company,
        jobTitle,
        linkedinUrl,
        website,
        industry,
        companySize,
        location,
        fundingStage,
        source,
        tags,
        notes
      } = req.body;

      const lead = await prisma.lead.create({
        data: {
          userId,
          name,
          email,
          company,
          jobTitle,
          linkedinUrl,
          website,
          industry,
          companySize,
          location,
          fundingStage,
          source,
          tags: tags || [],
          notes
        }
      });

      // 更新用户统计
      await prisma.user.update({
        where: { id: userId },
        data: { totalLeads: { increment: 1 } }
      });

      res.status(201).json(lead);
    } catch (error) {
      console.error('Create lead error:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  }
);

// 批量导入潜在客户
router.post('/bulk-import', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { leads } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Invalid leads data' });
    }

    const createdLeads = await prisma.lead.createMany({
      data: leads.map((lead: any) => ({
        userId,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        jobTitle: lead.jobTitle,
        linkedinUrl: lead.linkedinUrl,
        website: lead.website,
        industry: lead.industry,
        companySize: lead.companySize,
        location: lead.location,
        source: 'bulk_import'
      })),
      skipDuplicates: true
    });

    // 更新用户统计
    await prisma.user.update({
      where: { id: userId },
      data: { totalLeads: { increment: createdLeads.count } }
    });

    res.json({
      imported: createdLeads.count,
      message: `Successfully imported ${createdLeads.count} leads`
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

// 获取单个潜在客户
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const lead = await prisma.lead.findFirst({
      where: { id, userId },
      include: {
        emails: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// 更新潜在客户
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const lead = await prisma.lead.findFirst({
      where: { id, userId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: req.body
    });

    res.json(updatedLead);
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// 删除潜在客户
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const lead = await prisma.lead.findFirst({
      where: { id, userId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await prisma.lead.delete({ where: { id } });

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

export default router;