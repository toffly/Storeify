import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";

export const getMerchantStore = (merchantId: string) => {
  return prisma.stores.findFirst({ where: { merchant_id: merchantId } });
};

// Create new Product
export const createProduct = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const store = await getMerchantStore(req.user!.id);
    if (!store) {
      res.status(404).json({
        success: false,
        message: "You must create a store beform adding products",
      });
      return;
    }
    const {
      name,
      description,
      price,
      compare_at_price,
      sku,
      stock = 0,
      category_id,
      images = [],
      varients = [],
      status = "active",
    } = req.body;

    if (!name || price === undefined) {
      res.status(400).json({
        success: false,
        message: "Product name and price are required",
      });
      return;
    }

    const product = await prisma.products.create({
      data: {
        store_id: store.id,
        category_id: category_id ? Number(category_id) : null,
        name: name.trim(),
        description: description,
        price: Number(price),
        compare_at_price: compare_at_price ? Number(compare_at_price) : null,
        sku: sku?.trim() || 0,
        images: Array.isArray(images) ? images : [],
        varients: Array.isArray(varients) ? varients : [],
        status: status || "active",
      },
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error: any) {
    console.error("createProduct error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create product" });
  }
};

// Update Product
export const updateProduct = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {};

// Delete existing Product
export const deleteProduct = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {};
