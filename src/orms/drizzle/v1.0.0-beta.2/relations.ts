/**
 * Drizzle Relations - Version 1.0.0-beta.2
 * Using new RQBv2 syntax
 */

import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
  users: {
    orders: r.many.orders({
      from: r.users.id,
      to: r.orders.userId,
    }),
    reviews: r.many.reviews({
      from: r.users.id,
      to: r.reviews.userId,
    }),
  },
  categories: {
    parent: r.one.categories({
      from: r.categories.parentId,
      to: r.categories.id,
      alias: 'CategoryHierarchy',
    }),
    children: r.many.categories({
      from: r.categories.id,
      to: r.categories.parentId,
      alias: 'CategoryHierarchy',
    }),
    products: r.many.products({
      from: r.categories.id,
      to: r.products.categoryId,
    }),
  },
  products: {
    category: r.one.categories({
      from: r.products.categoryId,
      to: r.categories.id,
    }),
    orderItems: r.many.orderItems({
      from: r.products.id,
      to: r.orderItems.productId,
    }),
    reviews: r.many.reviews({
      from: r.products.id,
      to: r.reviews.productId,
    }),
    tags: r.many.tags({
      from: r.products.id.through(r.productTags.productId),
      to: r.tags.id.through(r.productTags.tagId),
    }),
    inventoryLogs: r.many.inventoryLogs({
      from: r.products.id,
      to: r.inventoryLogs.productId,
    }),
  },
  tags: {
    products: r.many.products({
      from: r.tags.id.through(r.productTags.tagId),
      to: r.products.id.through(r.productTags.productId),
    }),
  },
  orders: {
    user: r.one.users({
      from: r.orders.userId,
      to: r.users.id,
    }),
    orderItems: r.many.orderItems({
      from: r.orders.id,
      to: r.orderItems.orderId,
    }),
  },
  orderItems: {
    order: r.one.orders({
      from: r.orderItems.orderId,
      to: r.orders.id,
    }),
    product: r.one.products({
      from: r.orderItems.productId,
      to: r.products.id,
    }),
  },
  reviews: {
    product: r.one.products({
      from: r.reviews.productId,
      to: r.products.id,
    }),
    user: r.one.users({
      from: r.reviews.userId,
      to: r.users.id,
    }),
  },
  inventoryLogs: {
    product: r.one.products({
      from: r.inventoryLogs.productId,
      to: r.products.id,
    }),
  },
}));
