import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// TODO: 实现营销活动路由
router.get('/', (req, res) => {
  res.json({ message: 'Campaigns endpoint - Coming soon' });
});

export default router;