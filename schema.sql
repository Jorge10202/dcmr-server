CREATE DATABASE IF NOT EXISTS dcmr_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dcmr_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  correo VARCHAR(100) NOT NULL UNIQUE,
  contraseña_hash VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  direccion TEXT,
  rol ENUM('cliente','admin') NOT NULL DEFAULT 'cliente',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  imagen1 VARCHAR(255),
  imagen2 VARCHAR(255),
  id_categoria INT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_cat FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_stats (
  product_id INT PRIMARY KEY,
  views INT NOT NULL DEFAULT 0,
  added_to_cart INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_stats_prod FOREIGN KEY (product_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS carts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status ENUM('open','ordered') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price_snapshot DECIMAL(10,2) NOT NULL,
  UNIQUE KEY unique_cart_product (cart_id, product_id),
  CONSTRAINT fk_ci_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_prod FOREIGN KEY (product_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('nuevo','pagado','enviado','completado','cancelado') NOT NULL DEFAULT 'nuevo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_prod FOREIGN KEY (product_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_favorites (
  user_id    INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_prod FOREIGN KEY (product_id) REFERENCES productos(id) ON DELETE CASCADE
);

ALTER TABLE orders
  MODIFY status ENUM('nuevo','pagado','enviado','completado','entregado','cancelado', 'deposito')
  NOT NULL DEFAULT 'nuevo';

ALTER TABLE productos
  ADD COLUMN descuento_pct DECIMAL(5,2) NULL AFTER precio,
  ADD COLUMN promo_inicio DATETIME NULL AFTER descuento_pct,
  ADD COLUMN promo_fin DATETIME NULL AFTER promo_inicio;

INSERT INTO categorias (nombre) VALUES ('Sala'), ('Comedor'), ('Dormitorio') ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

UPDATE users SET rol='admin' WHERE correo='admin@dcmr.com';