import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { pool } from '../db.js';
import { list, byId, create, update, removeP, adjustStock, getProductById } from '../controllers/productsController.js';


const r = Router();

r.get('/', list);
r.get('/:id', byId);

r.get('/', async (req, res) => {
  try {
    const cat = req.query.cat || req.query.category;
    const q = (req.query.q || '').trim();

    let sql = `
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.id_categoria
      WHERE 1=1
    `;
    const params = [];

    if (cat && cat !== 'all') {
      sql += ' AND p.id_categoria = ?';
      params.push(cat);
    }
    if (q) {
      sql += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += ' ORDER BY p.id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('[PRODUCTS list]', e);
    res.status(500).json({ error: 'No se pudieron listar productos' });
  }
});

r.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre
         FROM productos p
         LEFT JOIN categorias c ON c.id = p.id_categoria
        WHERE p.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });

    await pool.query(
      'INSERT INTO product_stats (product_id, views, added_to_cart) VALUES (?,1,0) ON DUPLICATE KEY UPDATE views = views + 1',
      [req.params.id]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error('[PRODUCTS detail]', e);
    res.status(500).json({ error: 'No se pudo obtener el producto' });
  }
});

r.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, imagen1, imagen2, id_categoria } = req.body;
    if (!nombre || !precio) return res.status(400).json({ error: 'Nombre y precio son obligatorios' });

    const [r1] = await pool.query(
      'INSERT INTO productos (nombre, descripcion, precio, stock, imagen1, imagen2, id_categoria) VALUES (?,?,?,?,?,?,?)',
      [nombre, descripcion || null, precio, stock || 0, imagen1 || null, imagen2 || null, id_categoria || null]
    );
    await pool.query('INSERT IGNORE INTO product_stats (product_id, views, added_to_cart) VALUES (?,?,?)', [r1.insertId, 0, 0]);
    res.json({ id: r1.insertId });
  } catch (e) {
    console.error('[PRODUCTS create]', e);
    res.status(500).json({ error: 'Error creando producto' });
  }
});

r.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, imagen1, imagen2, id_categoria } = req.body;
    await pool.query(
      'UPDATE productos SET nombre=?, descripcion=?, precio=?, stock=?, imagen1=?, imagen2=?, id_categoria=? WHERE id=?',
      [nombre, descripcion, precio, stock, imagen1, imagen2, id_categoria, id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[PRODUCTS update]', e);
    res.status(500).json({ error: 'Error actualizando producto' });
  }
});

r.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM productos WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[PRODUCTS delete]', e);
    res.status(500).json({ error: 'Error eliminando producto' });
  }
});

r.patch('/:id/stock', requireAuth, requireAdmin, adjustStock);
r.get('/:id', getProductById);

export default r;

