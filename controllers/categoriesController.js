import { pool } from '../db.js';

export const list = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, descripcion FROM categorias ORDER BY id DESC'
    );
    res.json(rows);
  } catch (e) {
    console.error('[CATEGORIES list]', e);
    res.status(500).json({ error: 'No se pudieron listar categorías' });
  }
};

export const create = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body || {};
    if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
    const [r] = await pool.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES (?,?)',
      [nombre, descripcion ?? null]
    );
    res.json({ id: r.insertId });
  } catch (e) {
    console.error('[CATEGORIES create]', e);
    res.status(500).json({ error: 'No se pudo crear la categoría' });
  }
};

export const update = async (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, descripcion } = req.body || {};
    await pool.query(
      'UPDATE categorias SET nombre=?, descripcion=? WHERE id=?',
      [nombre ?? null, descripcion ?? null, id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[CATEGORIES update]', e);
    res.status(500).json({ error: 'No se pudo actualizar la categoría' });
  }
};

export const removeC = async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM categorias WHERE id=?', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[CATEGORIES delete]', e);
    res.status(500).json({ error: 'No se pudo eliminar la categoría' });
  }
};
