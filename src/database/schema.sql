-- ============================================================================
-- E-COMMERCE BENCHMARK DATABASE SCHEMA
-- ============================================================================
-- Purpose: Realistic schema for ORM performance testing
-- Tables: 9 tables with various relationship types
-- Indexes: Optimized for common query patterns
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Purpose: Customer accounts
-- Relationships: One-to-many with orders, reviews
-- Size: ~100,000 rows (medium table)

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
-- Purpose: Product categorization (hierarchical/tree structure)
-- Relationships: Self-referential (parent_id), one-to-many with products
-- Size: ~1,000 rows (small table)

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for categories
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active) WHERE is_active = true;

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
-- Purpose: Product catalog
-- Relationships: Many-to-one with categories, one-to-many with order_items, reviews
-- Size: ~50,000 rows (medium table)

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    cost_price DECIMAL(10, 2) CHECK (cost_price >= 0),
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    inventory_count INTEGER DEFAULT 0 NOT NULL CHECK (inventory_count >= 0),
    is_active BOOLEAN DEFAULT true NOT NULL,
    weight_grams INTEGER,
    dimensions_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for products
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_is_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_inventory ON products(inventory_count) WHERE inventory_count > 0;

-- ============================================================================
-- TAGS TABLE
-- ============================================================================
-- Purpose: Product tags for filtering/search
-- Relationships: Many-to-many with products (through product_tags)
-- Size: ~500 rows (small table)

CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for tags
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC);

-- ============================================================================
-- PRODUCT_TAGS TABLE (Junction Table)
-- ============================================================================
-- Purpose: Many-to-many relationship between products and tags
-- Size: ~150,000 rows (avg 3 tags per product)

CREATE TABLE product_tags (
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    tag_id BIGINT REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (product_id, tag_id)
);

-- Indexes for product_tags
CREATE INDEX idx_product_tags_tag_id ON product_tags(tag_id);

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================
-- Purpose: Customer orders
-- Relationships: Many-to-one with users, one-to-many with order_items
-- Size: ~500,000 rows (large table)

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    shipping_address_json JSONB NOT NULL,
    billing_address_json JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL
);

-- Indexes for orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ============================================================================
-- ORDER_ITEMS TABLE
-- ============================================================================
-- Purpose: Line items in orders
-- Relationships: Many-to-one with orders and products
-- Size: ~1,500,000 rows (avg 3 items per order, large table)

CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    product_snapshot_json JSONB NOT NULL, -- Store product details at time of order
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for order_items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ============================================================================
-- REVIEWS TABLE
-- ============================================================================
-- Purpose: Product reviews and ratings
-- Relationships: Many-to-one with products and users
-- Size: ~200,000 rows (large table)

CREATE TABLE reviews (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    helpful_count INTEGER DEFAULT 0 NOT NULL CHECK (helpful_count >= 0),
    is_verified_purchase BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for reviews
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_helpful_count ON reviews(helpful_count DESC);

-- ============================================================================
-- INVENTORY_LOGS TABLE (Time-Series Data)
-- ============================================================================
-- Purpose: Track inventory changes over time
-- Relationships: Many-to-one with products
-- Size: ~2,000,000 rows (time-series, very large table)

CREATE TABLE inventory_logs (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    change_amount INTEGER NOT NULL, -- Can be negative
    reason VARCHAR(50) NOT NULL, -- 'sale', 'restock', 'adjustment', 'return'
    previous_count INTEGER NOT NULL,
    new_count INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for inventory_logs
CREATE INDEX idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at DESC);
CREATE INDEX idx_inventory_logs_reason ON inventory_logs(reason);

-- ============================================================================
-- CONSTRAINTS & CHECK CONSTRAINTS
-- ============================================================================

-- Ensure order total matches sum of order items (can be enforced via trigger)
-- Ensure inventory counts are never negative
-- Ensure prices are reasonable (not null, >= 0)

-- ============================================================================
-- FUNCTIONS & TRIGGERS (Optional but recommended)
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STATISTICS & PERFORMANCE
-- ============================================================================

-- Increase statistics target for better query planning
ALTER TABLE products ALTER COLUMN name SET STATISTICS 1000;
ALTER TABLE orders ALTER COLUMN created_at SET STATISTICS 1000;
ALTER TABLE order_items ALTER COLUMN order_id SET STATISTICS 1000;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Total Tables: 9
-- Expected Total Rows: ~4.5 million
-- 
-- Table Sizes (approximate):
-- - users: 100,000 rows
-- - categories: 1,000 rows
-- - products: 50,000 rows
-- - tags: 500 rows
-- - product_tags: 150,000 rows
-- - orders: 500,000 rows
-- - order_items: 1,500,000 rows
-- - reviews: 200,000 rows
-- - inventory_logs: 2,000,000 rows
-- ============================================================================