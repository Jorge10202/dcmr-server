import { pool } from '../db.js';

export const list = async (req, res) => {
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
};

export const byId = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre
         FROM productos p
         LEFT JOIN categorias c ON c.id = p.id_categoria
        WHERE p.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (e) {
    console.error('[PRODUCTS detail]', e);
    res.status(500).json({ error: 'No se pudo obtener el producto' });
  }
};

export const create = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, imagen1, imagen2, id_categoria } = req.body;
    if (!nombre || !precio) return res.status(400).json({ error: 'Nombre y precio son obligatorios' });

    const [r] = await pool.query(
      'INSERT INTO products (nombre, descripcion, precio, stock, imagen1, imagen2, id_categoria) VALUES (?,?,?,?,?,?,?)',
      [nombre, descripcion ?? null, precio, stock ?? 0, imagen1 ?? null, imagen2 ?? null, id_categoria ?? null]
    );
    res.json({ id: r.insertId });
  } catch (e) {
    console.error('[PRODUCTS create]', e);
    res.status(500).json({ error: 'Error creando producto' });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, imagen1, imagen2, id_categoria } = req.body ?? {};

    const [r] = await pool.query(
      `UPDATE products SET
        nombre      = COALESCE(?, nombre),
        descripcion = COALESCE(?, descripcion),
        precio      = COALESCE(?, precio),
        stock       = COALESCE(?, stock),
        imagen1     = COALESCE(?, imagen1),
        imagen2     = COALESCE(?, imagen2),
        id_categoria= COALESCE(?, id_categoria)
      WHERE id=?`,
      [
        nombre ?? null,
        descripcion ?? null,
        typeof precio === 'number' ? precio : null,
        typeof stock === 'number' ? stock : null,
        imagen1 ?? null,
        imagen2 ?? null,
        id_categoria ?? null,
        id
      ]
    );
    res.json({ ok: true, changed: r.affectedRows });
  } catch (e) {
    console.error('[PRODUCTS update]', e);
    res.status(500).json({ error: 'Error actualizando producto' });
  }
};

export const removeP = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM products WHERE id=?', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[PRODUCTS remove]', e);
    res.status(500).json({ error: 'Error eliminando producto' });
  }
};

export const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    let { delta } = req.body || {};
    delta = Number(delta || 0);
    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ error: 'Delta inválido' });
    }
    await pool.query(
      'UPDATE products SET stock = GREATEST(0, stock + ?) WHERE id=?',
      [delta, id]
    );
    const [[p]] = await pool.query('SELECT id, stock FROM products WHERE id=?', [id]);
    res.json({ ok: true, id: p.id, stock: p.stock });
  } catch (e) {
    console.error('[PRODUCTS adjustStock]', e);
    res.status(500).json({ error: 'No se pudo ajustar el stock' });
  }
};

export async function getProductById(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(`
      SELECT
        p.*,
        d.percent AS discount_percent,
        d.start_at AS discount_start,
        d.end_at   AS discount_end,
        CASE
          WHEN d.percent IS NULL THEN NULL
          ELSE ROUND(p.precio * (1 - d.percent/100), 2)
        END AS price_with_discount
      FROM productos p
      LEFT JOIN discounts d
        ON d.product_id = p.id
       AND d.percent > 0
       AND (d.start_at IS NULL OR d.start_at <= NOW())
       AND (d.end_at   IS NULL OR d.end_at   >= NOW())
      WHERE p.id = ?
      LIMIT 1
    `, [id]);

    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo producto' });
  }
};

