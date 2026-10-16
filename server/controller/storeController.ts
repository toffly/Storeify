import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";
import {
  findNeonMerchants,
  findNeonUserByIds,
  updateNeonUserRole,
} from "../services/neonUser.js";
import { umask } from "node:process";

// Helper to generate clean slug
const generateSlug = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/--+/g, "-");
};

// Create a new store ( for authenticated merchant )
export const createStore = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const merchantId = req.user?.id;
    if (!merchantId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Please log in to create a store",
      });
      return;
    }

    // Platform admin account cannnot create a stores or become merchants
    if (req.user?.role === "admin") {
      res.status(403).json({
        success: false,
        message:
          "Forbidden: Platform admin accounts cannot create stores or become merchants",
      });
      return;
    }

    // Check if merchant already has a store
    const existingStore = await prisma.stores.findFirst({
      where: { merchant_id: merchantId },
    });

    if (existingStore) {
      res.status(400).json({
        success: false,
        message: "You already have an existing store",
        store: existingStore,
      });
      return;
    }

    const {
      name,
      slug,
      description,
      logo_url,
      banner_url,
      currency = "USD",
      shipping_fee = 0,
      free_shipping_threshold = 0,
      hero_style = "hero1",
      accent_color = "#059669",
    } = req.body;

    if (!name) {
      res
        .status(400)
        .json({ success: false, message: "Store name is required" });
      return;
    }

    const finalSlug = slug ? generateSlug(slug) : generateSlug(name);

    // Check if slug is taken
    const slugCheck = await prisma.stores.findUnique({
      where: { slug: finalSlug },
      select: { id: true },
    });

    if (slugCheck) {
      res.status(400).json({
        success: false,
        message: "Store URL slug is already taken. Please choose another",
      });
      return;
    }

    const newStore = await prisma.stores.create({
      data: {
        merchant_id: merchantId,
        name: name.trim(),
        slug: finalSlug,
        description: description || "",
        logo_url: logo_url || "",
        banner_url: banner_url || "",
        currency,
        status: "active",
        shipping_fee: Number(shipping_fee) || 0,
        free_shipping_threshold: Number(free_shipping_threshold) || 0,
        hero_style: ["hero1", "hero2", "hero3", "hero4"].includes(hero_style)
          ? hero_style
          : "hero1",
        accent_color: accent_color?.trim() || "#059669",
      },
    });

    // Update user role to merchant
    await updateNeonUserRole(merchantId, "merchant");

    res.status(201).json({
      success: true,
      message: "Store created successfully",
      store: newStore,
    });
  } catch (error: any) {
    console.error("createStore error:", error);
    res.status(500).json({ success: false, message: "Failed to create store" });
  }
};

// Get authenticated merchant's store
export const getMyStore = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role === "admin") {
      res.status(403).json({
        success: false,
        message: "Forbidden: Platform admin do not manage merchant stores",
      });
      return;
    }

    const merchantId = req.user?.id;
    const store = await prisma.stores.findFirst({
      where: { merchant_id: merchantId },
    });

    res.json({ success: true, store: store || null });
  } catch (error: any) {
    console.error("getMyStore error:", error);
    res
      .status(500)
      .json({ success: false, message: "getMyStore error:" + error });
  }
};

// onboard or elevate user to merchant role
export const onboardMerchant = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Platform admin account cannnot create a stores or become merchants
    if (req.user?.role === "admin") {
      res.status(403).json({
        success: false,
        message:
          "Forbidden: Platform admin accounts cannot create stores or become merchants",
      });
      return;
    }

    await updateNeonUserRole(userId, "merchant");
    const store = await prisma.stores.findFirst({
      where: { merchant_id: userId },
    });

    res.json({
      success: true,
      role: "merchant",
      store: store || null,
    });
  } catch (error: any) {
    console.error("Failed to onboard merchant:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to onboard merchant" });
  }
};

// Update merchant's store settings
export const updateMyStore = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role === "admin") {
      res.status(403).json({
        success: false,
        message:
          "Forbidden: Platform admin accounts cannot create stores or become merchants",
      });
      return;
    }

    const merchantId = req.user?.id;
    const store = await prisma.stores.findFirst({
      where: { merchant_id: merchantId },
    });

    if (!store) {
      res.status(404).json({ success: false, message: "Store not found" });
      return;
    }

    const {
      name,
      description,
      logo_url,
      banner_url,
      currency,
      shipping_fee,
      free_shipping_threshold,
      hero_style,
      accent_color,
    } = req.body;

    const VALID_HERO = ["hero1", "hero2", "hero3", "hero4"];

    const updated = await prisma.stores.update({
      where: {
        id: store.id,
      },
      data: {
        ...Object.fromEntries(
          Object.entries({
            name,
            description,
            logo_url,
            banner_url,
            currency,
          }).filter(([, v]) => v !== undefined),
        ),
        ...(shipping_fee !== undefined && {
          shipping_fee: Number(shipping_fee),
        }),
        ...(free_shipping_threshold !== undefined && {
          free_shipping_threshold: Number(free_shipping_threshold),
        }),
        ...(hero_style && VALID_HERO.includes(hero_style) && { hero_style }),
        ...(accent_color && {
          accent_color: String(accent_color).trim() || "#059669",
        }),
      },
    });
    res.json({
      success: true,
      message: "Store updated successfully",
      store: updated,
    });
  } catch (error: any) {
    console.error("updateMyStore error:", error);
    res.status(500).json({ success: false, message: "Failed to update store" });
  }
};

// Platform Admin: Get all stores with stats
export const getAllStore = async (
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const storeList = await prisma.stores.findMany({
      include: {
        _count: { select: { products: true, orders: true } },
        orders: { where: { payment_status: "paid" }, select: { total: true } },
      },
      orderBy: { created_at: "desc" },
    });

    const merchantIds = storeList
      .map((s) => s.merchant_id)
      .filter(Boolean) as string[];
    const userMap = await findNeonUserByIds(merchantIds);

    const stores = storeList.map((s) => {
      const total_revenue = s.orders.reduce(
        (sum, o) => sum + Number(o.total),
        0,
      );
      const merchant = s.merchant_id ? userMap[s.merchant_id] : null;
      const { orders, _count, ...rest } = s;
      return {
        ...rest,
        merchant_name: merchant?.name || "Unknown",
        merchant_email: merchant?.email || "Unknown",
        product_count: _count.products,
        order_count: _count.orders,
        total_revenue,
      };
    });
    res.json({ success: true, stores });
  } catch (error: any) {
    console.error("getAllStore error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stores" });
  }
};

// Platform Admin: Get all merchants
export const getAllMerchants = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const merchantList = await findNeonMerchants();

    const stores = await prisma.stores.findMany({
      where: { merchant_id: { in: merchantList.map((m) => m.id) } },
      select: {
        id: true,
        merchant_id: true,
        name: true,
        slug: true,
        status: true,
      },
    });

    const storeMap = new Map<string, (typeof stores)[0]>();

    for (const store of stores) {
      if (store.merchant_id) storeMap.set(store.merchant_id, store);
    }

    const merchants = merchantList.map((u) => {
      const store = storeMap.get(u.id) ?? null;
      return {
        ...u,
        store_id: store?.id ?? null,
        store_name: store?.name ?? null,
        store_slug: store?.slug ?? null,
        store_status: store?.status ?? null,
      };
    });

    res.json({ success: true, merchants });
    
  } catch (error: any) {
    console.error("getAllMerchants error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch merchants" });
  }
};

// Platform Admin: Toggle store status ( active / suspended )
export const toggleStoreStatus = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {};
