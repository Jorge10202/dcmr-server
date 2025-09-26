import { Router } from 'express';
import { checkout, myOrders, downloadInvoice, checkoutDeposit } from '../controllers/ordersController.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

r.post('/checkout', checkout);
r.get('/', myOrders);                 
r.get('/:id/invoice', downloadInvoice); 
r.post('/checkout-deposit', requireAuth, checkoutDeposit);

export default r;

