/*import { Router } from 'express';
import { list, create, update, removeC } from '../controllers/categoriesController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const r = Router();
r.get('/', list);
r.post('/', requireAuth, requireAdmin, create);
r.put('/:id', requireAuth, requireAdmin, update);
r.delete('/:id', requireAuth, requireAdmin, removeC);
export default r;*/

// server/routes/categories.js
import { Router } from 'express';
import { list, create, update, removeC } from '../controllers/categoriesController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const r = Router();

r.get('/', list);

r.post('/',  requireAuth, requireAdmin, create);
r.put('/:id', requireAuth, requireAdmin, update);
r.delete('/:id', requireAuth, requireAdmin, removeC);

export default r;
