import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";

const generateOrderNumber = () =>
  `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

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

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await prisma.products.findFirst({
        where: { id: Number(item.productId), store_id: targetStore.id },
      });
      if (!product) {
        res.status(400).json({
          success: false,
          message: `product ${item.name || item.productId} no longer exists`,
        });
        return;
      }

      const qty = Math.max(1, Number(item.quantity) || 1);
      if ((product.stock ?? 0) < qty) {
        res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name}. Available: ${product.stock}`,
        });
        return;
      }

      const itemPrice = Number(product.price);
      subtotal += itemPrice * qty;
      const images = Array.isArray(product.images)
        ? (product.images as string[])
        : [];
      processedItems.push({
        productId: product.id,
        name: product.name,
        price: itemPrice,
        quantity: qty,
        variant: item.variant || null,
        image: images[0] || null,
      });

      await prisma.products.update({
        where: { id: product.id },
        data: { stock: { decrement: qty } },
      });
    }

    const shippingFee = Number(targetStore.shipping_fee) || 0;
    const freeThreshold = Number(targetStore.free_shipping_threshold) || 0;
    const shippingCost =
      freeThreshold > 0 && subtotal >= freeThreshold ? 0 : shippingFee;
    const total = Math.max(0, subtotal + shippingCost);
    const customerId = req.user?.id || null;

    const order = await prisma.orders.create({
      data: {
        order_number: generateOrderNumber(),
        store_id: targetStore.id,
        customer_id: customerId,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim().toLowerCase(),
        customer_phone: customerPhone || null,
        shipping_address: shippingAddress,
        items: processedItems,
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

    res
      .status(201)
      .json({ success: true, message: "Order placed successfully", order });
  } catch (error: any) {
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
