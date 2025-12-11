/**
 * Drizzle Schema - Version 1.0.0-beta.2
 * Tables only - relations are defined separately
 */

import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  decimal,
  integer,
  jsonb,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

// USERS TABLE
export const users = pgTable(
  'users',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    emailIdx: index('idx_users_email').on(table.email),
    usernameIdx: index('idx_users_username').on(table.username),
    createdAtIdx: index('idx_users_created_at').on(table.createdAt),
    isActiveIdx: index('idx_users_is_active').on(table.isActive),
  }),
);

// CATEGORIES TABLE
export const categories = pgTable(
  'categories',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    parentId: bigserial('parent_id', { mode: 'number' }).references(
      (): any => categories.id,
      { onDelete: 'set null' },
    ),
    displayOrder: integer('display_order').default(0),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    parentIdIdx: index('idx_categories_parent_id').on(table.parentId),
    slugIdx: index('idx_categories_slug').on(table.slug),
    isActiveIdx: index('idx_categories_is_active').on(table.isActive),
  }),
);

// PRODUCTS TABLE
export const products = pgTable(
  'products',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    sku: varchar('sku', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
    categoryId: bigserial('category_id', { mode: 'number' }).references(
      () => categories.id,
      { onDelete: 'set null' },
    ),
    inventoryCount: integer('inventory_count').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    weightGrams: integer('weight_grams'),
    dimensionsJson: jsonb('dimensions_json'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    skuIdx: index('idx_products_sku').on(table.sku),
    categoryIdIdx: index('idx_products_category_id').on(table.categoryId),
    priceIdx: index('idx_products_price').on(table.price),
    isActiveIdx: index('idx_products_is_active').on(table.isActive),
    inventoryIdx: index('idx_products_inventory').on(table.inventoryCount),
  }),
);

// TAGS TABLE
export const tags = pgTable(
  'tags',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 50 }).notNull().unique(),
    slug: varchar('slug', { length: 50 }).notNull().unique(),
    usageCount: integer('usage_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index('idx_tags_slug').on(table.slug),
    usageCountIdx: index('idx_tags_usage_count').on(table.usageCount),
  }),
);

// PRODUCT_TAGS TABLE (Junction)
export const productTags = pgTable(
  'product_tags',
  {
    productId: bigserial('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    tagId: bigserial('tag_id', { mode: 'number' })
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.tagId] }),
    tagIdIdx: index('idx_product_tags_tag_id').on(table.tagId),
  }),
);

// ORDERS TABLE
export const orders = pgTable(
  'orders',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    userId: bigserial('user_id', { mode: 'number' }).references(
      () => users.id,
      { onDelete: 'set null' },
    ),
    status: varchar('status', { length: 50 }).default('pending').notNull(),
    totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
    shippingAddressJson: jsonb('shipping_address_json').notNull(),
    billingAddressJson: jsonb('billing_address_json').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    shippedAt: timestamp('shipped_at'),
    deliveredAt: timestamp('delivered_at'),
  },
  (table) => ({
    userIdIdx: index('idx_orders_user_id').on(table.userId),
    orderNumberIdx: index('idx_orders_order_number').on(table.orderNumber),
    statusIdx: index('idx_orders_status').on(table.status),
    createdAtIdx: index('idx_orders_created_at').on(table.createdAt),
  }),
);

// ORDER_ITEMS TABLE
export const orderItems = pgTable(
  'order_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orderId: bigserial('order_id', { mode: 'number' })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: bigserial('product_id', { mode: 'number' }).references(
      () => products.id,
      { onDelete: 'set null' },
    ),
    productSnapshotJson: jsonb('product_snapshot_json').notNull(),
    quantity: integer('quantity').notNull(),
    unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
    subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index('idx_order_items_order_id').on(table.orderId),
    productIdIdx: index('idx_order_items_product_id').on(table.productId),
  }),
);

// REVIEWS TABLE
export const reviews = pgTable(
  'reviews',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    productId: bigserial('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    userId: bigserial('user_id', { mode: 'number' }).references(
      () => users.id,
      { onDelete: 'set null' },
    ),
    rating: integer('rating').notNull(),
    title: varchar('title', { length: 200 }),
    comment: text('comment'),
    helpfulCount: integer('helpful_count').default(0).notNull(),
    isVerifiedPurchase: boolean('is_verified_purchase')
      .default(false)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index('idx_reviews_product_id').on(table.productId),
    userIdIdx: index('idx_reviews_user_id').on(table.userId),
    ratingIdx: index('idx_reviews_rating').on(table.rating),
    createdAtIdx: index('idx_reviews_created_at').on(table.createdAt),
    helpfulCountIdx: index('idx_reviews_helpful_count').on(table.helpfulCount),
  }),
);

// INVENTORY_LOGS TABLE
export const inventoryLogs = pgTable(
  'inventory_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    productId: bigserial('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    changeAmount: integer('change_amount').notNull(),
    reason: varchar('reason', { length: 50 }).notNull(),
    previousCount: integer('previous_count').notNull(),
    newCount: integer('new_count').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index('idx_inventory_logs_product_id').on(table.productId),
    createdAtIdx: index('idx_inventory_logs_created_at').on(table.createdAt),
    reasonIdx: index('idx_inventory_logs_reason').on(table.reason),
  }),
);
