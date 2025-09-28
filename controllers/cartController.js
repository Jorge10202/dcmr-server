import { pool } from '../db.js';

async function ensureOpenCart(userId) {
  const [carts] = await pool.query('SELECT * FROM carts WHERE user_id=? AND status="open" LIMIT 1', [userId]);
  if (carts.length) return carts[0];
  const [r] = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [userId]);
  return { id: r.insertId, user_id: userId, status: 'open' };
}

function computeDiscountedPrice(prod) {
  const base = Number(prod.precio || 0);
  const pct = Number(prod.descuento_pct || 0);
  const now = Date.now();
  const startOk = !prod.promo_inicio || new Date(prod.promo_inicio).getTime() <= now;
  const endOk   = !prod.promo_fin    || new Date(prod.promo_fin).getTime()    >= now;
  const active  = pct > 0 && startOk && endOk;
  return active ? +(base * (1 - pct / 100)).toFixed(2) : base;
}

export const getCart = async (req, res) => {
  try {
    const cart = await ensureOpenCart(req.user.id);
    const [items] = await pool.query(
      `SELECT ci.id, ci.product_id, ci.quantity, ci.price_snapshot, p.nombre, p.imagen1
       FROM cart_items ci JOIN productos p ON p.id=ci.product_id WHERE ci.cart_id=?`,
      [cart.id]
    );
    res.json({ cartId: cart.id, items });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error obteniendo carrito' }); }
};

export const addItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) return res.status(400).json({ error: 'Datos inválidos' });

    const cart = await ensureOpenCart(req.user.id);

    const [[product]] = await pool.query(
      'SELECT id, precio, stock, descuento_pct, promo_inicio, promo_fin FROM productos WHERE id=?',
      [productId]
    );
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    await pool.query(
      'INSERT INTO product_stats (product_id, views, added_to_cart) VALUES (?,0,1) ON DUPLICATE KEY UPDATE added_to_cart = added_to_cart + 1',
      [productId]
    );

    const now = new Date();
    const pct = Number(product.descuento_pct || 0);
    const startOk = !product.promo_inicio || new Date(product.promo_inicio) <= now;
    const endOk   = !product.promo_fin    || new Date(product.promo_fin)    >= now;
    const promoActiva = pct > 0 && startOk && endOk;
    const unitPrice = promoActiva
      ? Number((Number(product.precio) * (1 - pct/100)).toFixed(2))
      : Number(product.precio);

    const [[existing]] = await pool.query(
      'SELECT * FROM cart_items WHERE cart_id=? AND product_id=?',
      [cart.id, productId]
    );
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) return res.status(400).json({ error: 'Stock insuficiente' });
      await pool.query('UPDATE cart_items SET quantity=? WHERE id=?', [newQty, existing.id]);
      return res.json({ ok: true });
    }

    if (quantity > product.stock) return res.status(400).json({ error: 'Stock insuficiente' });

    await pool.query(
      'INSERT INTO cart_items (cart_id, product_id, quantity, price_snapshot) VALUES (?,?,?,?)',
      [cart.id, productId, quantity, unitPrice]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error agregando al carrito' });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const [[ci]] = await pool.query('SELECT * FROM cart_items WHERE id=?', [itemId]);
    if (!ci) return res.status(404).json({ error: 'Item no encontrado' });
    const [[p]] = await pool.query('SELECT stock FROM productos WHERE id=?', [ci.product_id]);
    if (quantity > p.stock) return res.status(400).json({ error: 'Stock insuficiente' });
    await pool.query('UPDATE cart_items SET quantity=? WHERE id=?', [quantity, itemId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error actualizando item' }); }
};

export const removeItem = async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id=?', [req.params.itemId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error eliminando item' }); }
};
