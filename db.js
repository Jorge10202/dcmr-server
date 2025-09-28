import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const useSSL = process.env.DB_SSL === 'true'; 

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ...(useSSL ? { ssl: { rejectUnauthorized: false, minVersion: 'TLSv1.2' } } : {}),
});

export { pool };
