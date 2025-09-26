import { pool } from '../db.js';

export const listUsers = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, correo, telefono, direccion, rol, creado_en FROM users ORDER BY creado_en DESC'
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
};

export const listAllOrders = async (_req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.nombre AS usuario_nombre
       FROM orders o
       JOIN users u ON u.id=o.user_id
       ORDER BY o.created_at DESC`
    );
    for (const o of orders) {
      const [items] = await pool.query(
        `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, p.nombre
         FROM order_items oi
         JOIN productos p ON p.id=oi.product_id
         WHERE oi.order_id=?`,
        [o.id]
      );
      o.items = items;
    }
    res.json(orders);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error listando pedidos' });
  }
};

export const stats = async (req, res) => {
  try {
    const range = String(req?.query?.range || 'month').toLowerCase();
    let days = 30;
    let fmt  = '%Y-%m-%d'; 

    if (range === 'week') { days = 7; fmt = '%Y-%m-%d'; }
    if (range === 'year') { days = 365; fmt = '%Y-%m'; } 

    const [masVendidos] = await pool.query(
      `SELECT p.id, p.nombre, SUM(oi.quantity) AS vendidos
       FROM order_items oi
       JOIN orders o    ON o.id = oi.order_id
       JOIN productos p ON p.id = oi.product_id
       WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND o.status IN ('nuevo','pagado','enviado','completado')
       GROUP BY p.id, p.nombre
       ORDER BY vendidos DESC
       LIMIT 5`,
      [days]
    );

    const [timeline] = await pool.query(
      `SELECT DATE_FORMAT(o.created_at, ?) AS label,
              SUM(CASE WHEN o.status IN ('completado') THEN 1 ELSE 0 END) AS entregados,
              SUM(CASE WHEN o.status NOT IN ('completado','cancelado') THEN 1 ELSE 0 END) AS no_entregados
       FROM orders o
       WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY label
       ORDER BY label`,
      [fmt, days]
    );

    const [masCotizados] = await pool.query(
      `SELECT p.id, p.nombre, ps.added_to_cart AS cotizaciones
       FROM product_stats ps JOIN productos p ON p.id = ps.product_id
       ORDER BY ps.added_to_cart DESC
       LIMIT 5`
    );

    const [masVistos] = await pool.query(
      `SELECT p.id, p.nombre, ps.views AS vistas
       FROM product_stats ps JOIN productos p ON p.id = ps.product_id
       ORDER BY ps.views DESC
       LIMIT 5`
    );

    const [masFavoritos] = await pool.query(`
  SELECT p.id, p.nombre, COUNT(f.product_id) AS favoritos
    FROM productos p
    LEFT JOIN product_favorites f ON f.product_id = p.id
   GROUP BY p.id
   ORDER BY favoritos DESC
   LIMIT 10
    `);

    res.json({ range, masVendidos, masCotizados, masVistos, timeline, masFavoritos });
  } catch (e) {
    console.error('stats error:', e);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
};

const ALLOWED = new Set(['nuevo','pagado','enviado','completado','cancelado']);

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body || {};

    if (!ALLOWED.has(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const [r] = await pool.query('UPDATE orders SET status=? WHERE id=?', [status, id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Pedido no encontrado' });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo actualizar el estado' });
  }
};


