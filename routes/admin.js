import { Router } from 'express';
import { listUsers, listAllOrders, stats, updateOrderStatus } from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { applyDiscount, removeDiscount } from '../controllers/adminDiscountsController.js';

const r = Router();
r.use(requireAuth, requireAdmin);
r.get('/users', listUsers);
r.get('/orders', listAllOrders);
r.get('/stats', requireAdmin, stats);
r.put('/orders/:id/status', updateOrderStatus);
r.post('/discounts', requireAuth, requireAdmin, applyDiscount);
r.delete('/discounts/:productId', requireAuth, requireAdmin, removeDiscount);
export default r;
