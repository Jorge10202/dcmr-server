import { pool } from '../db.js';

export async function myFavoriteIds(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT product_id FROM product_favorites WHERE user_id=?',
      [req.user.id]
    );
    res.json({ ids: rows.map(r => r.product_id) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudieron obtener favoritos' });
  }
}

export async function listMyFavorites(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT p.*
         FROM product_favorites f
         JOIN productos p ON p.id = f.product_id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudieron listar favoritos' });
  }
}

export async function addFavorite(req, res) {
  try {
    const productId = Number(req.params.productId);
    if (!productId) return res.status(400).json({ error: 'Producto inválido' });

    await pool.query(
      `INSERT IGNORE INTO product_favorites (user_id, product_id) VALUES (?,?)`,
      [req.user.id, productId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo marcar favorito' });
  }
}

export async function removeFavorite(req, res) {
  try {
    const productId = Number(req.params.productId);
    if (!productId) return res.status(400).json({ error: 'Producto inválido' });

    await pool.query(
      `DELETE FROM product_favorites WHERE user_id=? AND product_id=?`,
      [req.user.id, productId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo quitar favorito' });
  }
}
