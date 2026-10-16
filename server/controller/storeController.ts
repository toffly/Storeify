import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";
import { updateNeonUserRole } from "../services/neonUser.js";

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
export const createStore = async (req: AuthenticatedRequest, res: Response) => {
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
) => {};

// onboard or elevate user to merchant role
export const onboardMerchant = async (
  req: AuthenticatedRequest,
  res: Response,
) => {};

// Update merchant's store settings
export const updateMyStore = async (
  req: AuthenticatedRequest,
  res: Response,
) => {};

// Platform Admin: Get all stores with stats
export const getAllStore = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {};

// Platform Admin: Get all merchants
export const getAllMerchants = async (
  req: AuthenticatedRequest,
  res: Response,
) => {};

// Platform Admin: Toggle store status ( active / suspended )
export const toggleStoreStatus = async (
  req: AuthenticatedRequest,
  res: Response,
) => {};
