-- Users table for staff authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'kitchen', 'counter', 'waiter')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Disable RLS for users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Customer sessions table for tracking unique customers
CREATE TABLE customer_sessions (
    id SERIAL PRIMARY KEY,
    table_id VARCHAR(10) NOT NULL,
    session_start TIMESTAMP DEFAULT NOW(),
    session_end TIMESTAMP,
    total_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed'))
);

-- Disable RLS for customer_sessions table
ALTER TABLE customer_sessions DISABLE ROW LEVEL SECURITY;

-- Menu items table
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Disable RLS for menu_items table
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_session_id INTEGER REFERENCES customer_sessions(id),
    table_id VARCHAR(10) NOT NULL,
    items JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'completed', 'served')),
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Disable RLS for orders table
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Insert default staff accounts
INSERT INTO users (username, password, role) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjPeGvGJRgHxGMzLMUcDOuRMQkqjyW', 'admin'),
('kitchen', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjPeGvGJRgHxGMzLMUcDOuRMQkqjyW', 'kitchen'),
('counter', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjPeGvGJRgHxGMzLMUcDOuRMQkqjyW', 'counter'),
('waiter', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjPeGvGJRgHxGMzLMUcDOuRMQkqjyW', 'waiter');

-- Insert sample menu items
INSERT INTO menu_items (name, price, category) VALUES
('Burger', 12.99, 'main'),
('Pizza', 15.99, 'main'),
('Coke', 2.99, 'drink');
