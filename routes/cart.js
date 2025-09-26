import { Router } from 'express';
import { getCart, addItem, updateItem, removeItem } from '../controllers/cartController.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);
r.get('/', getCart);
r.post('/add', addItem);
r.put('/item/:itemId', updateItem);
r.delete('/item/:itemId', removeItem);
export default r;
