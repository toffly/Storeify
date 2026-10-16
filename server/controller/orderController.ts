import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

const generateOrderNumber = () =>
  `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

class OrderAvailabilityError extends Error {}

const findStore = async (where: { slug?: string; id?: number }) => {
  return prisma.stores.findUnique({ where: where as any });
};

// Created new order
export const createOrder = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const {
      storeSlug,
      storeId,
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
    } = req.body;

    if (!items?.length) {
      res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
      return;
    }

    const cart: { item: (typeof items)[number]; quantity: number }[] = [];
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        res.status(400).json({
          success: false,
          message: "Item quantities must be positive integers",
        });
        return;
      }
      cart.push({ item, quantity });
    }

    if (!customerName || !customerEmail || !shippingAddress) {
      res.status(400).json({
        success: false,
        message: "Customer details and shipping address are required",
      });
      return;
    }

    const targetStore = storeSlug
      ? await findStore({ slug: storeSlug })
      : storeId
        ? await findStore({ id: Number(storeId) })
        : null;

    if (!targetStore) {
      res.status(400).json({
        success: false,
        message: "This store is suspended",
      });
      return;
    }

    if (targetStore.status === "suspended") {
      res.status(403).json({
        success: false,
        message: "This store is suspended",
      });
      return;
    }

    const customerId = req.user?.id || null;

    const order = await prisma.$transaction(async (tx) => {
      const products = await Promise.all(
        cart.map(({ item }) =>
          tx.products.findFirst({
            where: {
              id: Number(item.productId),
              store_id: targetStore.id,
              status: "active",
            },
          }),
        ),
      );

      const entries = cart.map(({ item, quantity }, index) => {
        const product = products[index];
        if (!product) {
          throw new OrderAvailabilityError(
            `product ${item.name || item.productId} no longer exists`,
          );
        }
        return { item, quantity, product };
      });

      const stockRequirements = new Map<
        number,
        { product: (typeof entries)[number]["product"]; quantity: number }
      >();
      for (const { product, quantity } of entries) {
        const requirement = stockRequirements.get(product.id);
        stockRequirements.set(product.id, {
          product,
          quantity: (requirement?.quantity ?? 0) + quantity,
        });
      }

      for (const { product, quantity } of stockRequirements.values()) {
        if ((product.stock ?? 0) < quantity) {
          throw new OrderAvailabilityError(
            `Not enough stock for ${product.name}. Available: ${product.stock}`,
          );
        }
      }

      let subtotal = new Prisma.Decimal(0);
      const orderItems = entries.map(({ item, quantity, product }) => {
        const images = Array.isArray(product.images)
          ? (product.images as string[])
          : [];
        subtotal = subtotal.plus(product.price.mul(quantity));
        return {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
          variant: item.variant || null,
          image: images[0] || null,
        };
      });

      for (const { product, quantity } of stockRequirements.values()) {
        const updated = await tx.products.updateMany({
          where: {
            id: product.id,
            store_id: targetStore.id,
            status: "active",
            stock: { gte: quantity },
          },
          data: { stock: { decrement: quantity } },
        });
        if (updated.count !== 1) {
          throw new OrderAvailabilityError(
            `Not enough stock for ${product.name}. Available: ${product.stock}`,
          );
        }
      }

      const shippingFee = targetStore.shipping_fee ?? new Prisma.Decimal(0);
      const freeThreshold =
        targetStore.free_shipping_threshold ?? new Prisma.Decimal(0);
      const shippingCost =
        freeThreshold.greaterThan(0) &&
        subtotal.greaterThanOrEqualTo(freeThreshold)
          ? new Prisma.Decimal(0)
          : shippingFee;
      const calculatedTotal = subtotal.plus(shippingCost);
      const total = calculatedTotal.greaterThan(0)
        ? calculatedTotal
        : new Prisma.Decimal(0);

      return tx.orders.create({
        data: {
          order_number: generateOrderNumber(),
          store_id: targetStore.id,
          customer_id: customerId,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim().toLowerCase(),
          customer_phone: customerPhone || null,
          shipping_address: shippingAddress,
          items: orderItems.map(({ price, ...item }) => ({
            ...item,
            price: price.toNumber(),
          })),
          subtotal,
          discount: 0,
          shipping_cost: shippingCost,
          total,
          coupon_code: null,
          payment_status: "pending",
          payment_method: "cod",
          order_status: "placed",
        },
      });
    });

    res
      .status(201)
      .json({ success: true, message: "Order placed successfully", order });
  } catch (error: any) {
    if (error instanceof OrderAvailabilityError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    console.error("createOrder error:", error);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
};

// Get merchant orders
export const getMerchantOrders = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {};

// Update order status
export const updateorderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {};

// Get order receipt
export const getOrderReceipt = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {};
