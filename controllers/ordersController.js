import { pool } from '../db.js';
import { buildInvoicePDF } from '../utils/invoicePdf.js';
import { sendMail } from '../utils/mailer.js';

async function getOrderFull(orderId) {
  const [[order]] = await pool.query('SELECT * FROM orders WHERE id=? LIMIT 1', [orderId]);
  if (!order) return null;

  const [[user]] = await pool.query(
    'SELECT id, nombre, correo, telefono, direccion FROM users WHERE id=? LIMIT 1',
    [order.user_id]
  );

  const [items] = await pool.query(`
    SELECT oi.order_id, oi.product_id, oi.quantity, oi.unit_price,
           p.nombre, p.descripcion
    FROM order_items oi
    JOIN productos p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `, [orderId]);

  return { order, user, items };
}

export const checkout = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [carts] = await conn.query(
      'SELECT * FROM carts WHERE user_id=? AND status="open" LIMIT 1',
      [req.user.id]
    );
    if (!carts.length) { await conn.release(); return res.status(400).json({ error: 'Carrito vacío' }); }
    const cart = carts[0];

    const [items] = await conn.query('SELECT * FROM cart_items WHERE cart_id=?', [cart.id]);
    if (!items.length) { await conn.release(); return res.status(400).json({ error: 'Carrito vacío' }); }

    for (const it of items) {
      const [[p]] = await conn.query('SELECT stock FROM productos WHERE id=? FOR UPDATE', [it.product_id]);
      if (!p || p.stock < it.quantity) {
        await conn.rollback(); await conn.release();
        return res.status(400).json({ error: 'Stock insuficiente' });
      }
    }

    for (const it of items) {
      await conn.query('UPDATE productos SET stock = stock - ? WHERE id=?', [it.quantity, it.product_id]);
    }

    const total = items.reduce((acc, it) => acc + Number(it.price_snapshot) * it.quantity, 0);
    const [orderR] = await conn.query(
      'INSERT INTO orders (user_id, total) VALUES (?,?)',
      [req.user.id, total]
    );
    const orderId = orderR.insertId;

    for (const it of items) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?,?,?,?)',
        [orderId, it.product_id, it.quantity, it.price_snapshot]
      );
    }

    await conn.query('UPDATE carts SET status="ordered" WHERE id=?', [cart.id]);
    await conn.query('INSERT INTO carts (user_id) VALUES (?)', [req.user.id]); 

    await conn.commit();
    await conn.release();

    try {
      const full = await getOrderFull(orderId);
      if (full) {
        const pdfBuf = await buildInvoicePDF({
          order: full.order,
          user: full.user,
          items: full.items,
          company: {
            name: process.env.COMPANY_NAME,
            address: process.env.COMPANY_ADDRESS,
            phone: process.env.COMPANY_PHONE
          }
        });

        await sendMail({
          to: full.user.correo,
          subject: `Comprobante de compra - DCMR`,
          text: `Hola ${full.user.nombre}, adjuntamos el comprobante de tu compra. ¡Gracias por comprar en DCMR!`,
          attachments: [
            { filename: `DCMR-Orden.pdf`, content: pdfBuf }
          ]
        });
      }
    } catch (err) {
      console.error('No se pudo enviar comprobante por correo:', err?.message || err);
    }

    res.json({ ok: true, orderId });
  } catch (e) {
    console.error(e);
    try { await conn.rollback(); await conn.release(); } catch {}
    res.status(500).json({ error: 'Error en checkout' });
  }
};

export const myOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC',
      [req.user.id]
    );
    for (const o of orders) {
      const [items] = await pool.query(
        'SELECT oi.*, p.nombre FROM order_items oi JOIN productos p ON p.id=oi.product_id WHERE oi.order_id=?',
        [o.id]
      );
      o.items = items;
    }
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: 'Error listando pedidos' });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const full = await getOrderFull(orderId);
    if (!full) return res.status(404).json({ error: 'Pedido no encontrado' });

    const isOwner = req.user?.id === full.order.user_id;
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'No autorizado' });

    const pdfBuf = await buildInvoicePDF({
      order: full.order,
      user: full.user,
      items: full.items,
      company: {
        name: process.env.COMPANY_NAME,
        address: process.env.COMPANY_ADDRESS,
        phone: process.env.COMPANY_PHONE
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="DCMR-Orden-${orderId}.pdf"`);
    res.send(pdfBuf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo generar el comprobante' });
  }
};


export const checkoutDeposit = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [carts] = await conn.query(
      'SELECT * FROM carts WHERE user_id=? AND status="open" LIMIT 1',
      [req.user.id]
    );
    if (!carts.length) { await conn.release(); return res.status(400).json({ error: 'Carrito vacío' }); }
    const cart = carts[0];

    const [items] = await conn.query('SELECT * FROM cart_items WHERE cart_id=?', [cart.id]);
    if (!items.length) { await conn.release(); return res.status(400).json({ error: 'Carrito vacío' }); }

    for (const it of items) {
      const [[p]] = await conn.query('SELECT stock FROM productos WHERE id=? FOR UPDATE', [it.product_id]);
      if (!p || p.stock < it.quantity) {
        await conn.rollback(); await conn.release();
        return res.status(400).json({ error: 'Stock insuficiente' });
      }
    }

    for (const it of items) {
      await conn.query('UPDATE productos SET stock = stock - ? WHERE id=?', [it.quantity, it.product_id]);
    }

    const total = items.reduce((acc, it) => acc + Number(it.price_snapshot) * it.quantity, 0);
    const [orderR] = await conn.query(
      'INSERT INTO orders (user_id, total, status) VALUES (?,?,?)',
      [req.user.id, total, 'deposito']
    );
    const orderId = orderR.insertId;

    for (const it of items) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?,?,?,?)',
        [orderId, it.product_id, it.quantity, it.price_snapshot]
      );
    }

    await conn.query('UPDATE carts SET status="ordered" WHERE id=?', [cart.id]);
    await conn.query('INSERT INTO carts (user_id) VALUES (?)', [req.user.id]);

    await conn.commit();
    await conn.release();

    try {
      const full = await getOrderFull(orderId);
      if (full) {
        const bankName   = process.env.BANK_NAME || 'Banco';
        const bankAcc    = process.env.BANK_ACCOUNT || '000-000000-0';
        const bankHolder = process.env.BANK_HOLDER || (process.env.COMPANY_NAME || 'Empresa');
        const whatsapp   = process.env.COMPANY_WHATSAPP || '+502 0000-0000';
        const company    = process.env.COMPANY_NAME || 'DCMR · Mueblería';

        await sendMail({
          to: full.user.correo,
          subject: `Datos de depósito bancario - Pedido`,
          html: `
            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;line-height:1.5">
              <h2 style="margin:0 0 8px">${company}</h2>
              <p>Hola ${full.user.nombre}, gracias por tu compra. Tu pedido <b></b> se generó con método <b>Depósito bancario</b>.</p>
              <p><b>Total:</b> Q ${Number(full.order.total).toFixed(2)}</p>
              <hr/>
              <p style="margin:12px 0 4px"><b>Datos bancarios</b></p>
              <ul style="margin:0 0 12px">
                <li><b>Banco:</b> ${bankName}</li>
                <li><b>No. de cuenta:</b> ${bankAcc}</li>
                <li><b>Nombre:</b> ${bankHolder}</li>
              </ul>
              <p>Al terminar tu depósito, por favor envía tu comprobante por WhatsApp al <b>${whatsapp}</b>.
                 Una vez verifiquemos el pago, tu pedido pasará a <b>Entregado</b>.</p>
              <p>¡Gracias por elegirnos!</p>
            </div>
          `,
        });
      }
    } catch (err) {
      console.error('No se pudo enviar correo de depósito:', err?.message || err);
    }

    res.json({ ok: true, orderId, status: 'deposito' });
  } catch (e) {
    console.error(e);
    try { await conn.rollback(); await conn.release(); } catch {}
    res.status(500).json({ error: 'Error en checkout por depósito' });
  }
};
