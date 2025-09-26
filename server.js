import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import favoritesRoutes from './routes/favorites.js';

import uploadRoutes from './routes/upload.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/', (req, res) => res.json({ ok: true, name: 'DCMR API' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/favorites', favoritesRoutes);

app.use('/api/upload', requireAuth, requireAdmin, uploadRoutes);

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));
