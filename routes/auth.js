import { Router } from 'express';
import { register, login, me, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();
r.post('/register', register);
r.post('/login', login);
r.get('/me', requireAuth, me);
r.put('/me', requireAuth, updateProfile);
export default r;
