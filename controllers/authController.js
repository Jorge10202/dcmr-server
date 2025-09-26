import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

export const register = async (req, res) => {
  try {
    const { nombre, correo, contraseña, telefono, direccion } = req.body;
    if (!nombre || !correo || !contraseña) return res.status(400).json({ error: 'Faltan campos' });

    const [exists] = await pool.query('SELECT id FROM users WHERE correo = ?', [correo]);
    if (exists.length) return res.status(409).json({ error: 'Correo ya registrado' });

    const hash = await bcrypt.hash(contraseña, 10);
    const [result] = await pool.query(
      'INSERT INTO users (nombre, correo, contraseña_hash, telefono, direccion) VALUES (?,?,?,?,?)',
      [nombre, correo, hash, telefono || null, direccion || null]
    );

    const payload = { id: result.insertId, role: 'cliente', nombre };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en registro' });
  }
};

export const login = async (req, res) => {
  try {
    const { correo, contraseña } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE correo = ?', [correo]);
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });
    const user = rows[0];
    const ok = await bcrypt.compare(contraseña, user.contraseña_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const payload = { id: user.id, role: user.rol, nombre: user.nombre };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en login' });
  }
};

export const me = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre, correo, rol FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { nombre, telefono, direccion } = req.body || {};
    const id = req.user.id;

    await pool.query(
      'UPDATE users SET nombre=?, telefono=?, direccion=? WHERE id=?',
      [nombre ?? null, telefono ?? null, direccion ?? null, id]
    );

    const [[user]] = await pool.query(
      'SELECT id, nombre, correo, telefono, direccion, rol, creado_en FROM users WHERE id=?',
      [id]
    );
    res.json({ user });
  } catch (e) {
    console.error('[AUTH updateProfile]', e);
    res.status(500).json({ error: 'No se pudo actualizar el perfil' });
  }
};