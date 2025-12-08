import { relations } from 'drizzle-orm/_relations';
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
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_username').on(table.username),
    index('idx_users_created_at').on(table.createdAt),
    index('idx_users_is_active').on(table.isActive),
  ],
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
  (table) => [
    index('idx_categories_parent_id').on(table.parentId),
    index('idx_categories_slug').on(table.slug),
    index('idx_categories_is_active').on(table.isActive),
  ],
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
  (table) => [
    index('idx_products_sku').on(table.sku),
    index('idx_products_category_id').on(table.categoryId),
    index('idx_products_price').on(table.price),
    index('idx_products_is_active').on(table.isActive),
    index('idx_products_inventory').on(table.inventoryCount),
  ],
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
  (table) => [
    index('idx_tags_slug').on(table.slug),
    index('idx_tags_usage_count').on(table.usageCount),
  ],
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
  (table) => [
    primaryKey({ columns: [table.productId, table.tagId] }),
    index('idx_product_tags_tag_id').on(table.tagId),
  ],
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
  (table) => [
    index('idx_orders_user_id').on(table.userId),
    index('idx_orders_order_number').on(table.orderNumber),
    index('idx_orders_status').on(table.status),
    index('idx_orders_created_at').on(table.createdAt),
  ],
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
  (table) => [
    index('idx_order_items_order_id').on(table.orderId),
    index('idx_order_items_product_id').on(table.productId),
  ],
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
  (table) => [
    index('idx_reviews_product_id').on(table.productId),
    index('idx_reviews_user_id').on(table.userId),
    index('idx_reviews_rating').on(table.rating),
    index('idx_reviews_created_at').on(table.createdAt),
    index('idx_reviews_helpful_count').on(table.helpfulCount),
  ],
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
  (table) => [
    index('idx_inventory_logs_product_id').on(table.productId),
    index('idx_inventory_logs_created_at').on(table.createdAt),
    index('idx_inventory_logs_reason').on(table.reason),
  ],
);

// RELATIONS (for Drizzle Relational Queries)

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  reviews: many(reviews),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'CategoryHierarchy',
  }),
  children: many(categories, {
    relationName: 'CategoryHierarchy',
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
  reviews: many(reviews),
  productTags: many(productTags),
  inventoryLogs: many(inventoryLogs),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  productTags: many(productTags),
}));

export const productTagsRelations = relations(productTags, ({ one }) => ({
  product: one(products, {
    fields: [productTags.productId],
    references: [products.id],
  }),
  tag: one(tags, {
    fields: [productTags.tagId],
    references: [tags.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export const inventoryLogsRelations = relations(inventoryLogs, ({ one }) => ({
  product: one(products, {
    fields: [inventoryLogs.productId],
    references: [products.id],
  }),
}));
