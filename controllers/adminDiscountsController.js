import { pool } from '../db.js';

function isValidPct(p) {
  const n = Number(p);
  return Number.isFinite(n) && n > 0 && n < 100;
}

export async function applyDiscount(req, res) {
  try {
    const { product_id, pct, start, end } = req.body || {};
    if (!product_id || !isValidPct(pct)) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    const startDt = start ? new Date(start) : null;
    const endDt   = end   ? new Date(end)   : null;

    await pool.query(
      `UPDATE productos
       SET descuento_pct=?, promo_inicio=?, promo_fin=?
       WHERE id=?`,
      [pct, startDt, endDt, product_id]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo aplicar el descuento' });
  }
}

export async function removeDiscount(req, res) {
  try {
    const productId = Number(req.params.productId);
    if (!productId) return res.status(400).json({ error: 'ID inválido' });

    await pool.query(
      `UPDATE productos
       SET descuento_pct=NULL, promo_inicio=NULL, promo_fin=NULL
       WHERE id=?`,
      [productId]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo quitar el descuento' });
  }
}
