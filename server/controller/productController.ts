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
      variants = [],
      status = "active",
    } = req.body;

    if (!name || price === undefined) {
      res.status(400).json({
        success: false,
        message: "Product name and price are required",
      });
      return;
    }

    if (category_id) {
      const category = await prisma.categories.findFirst({
        where: { id: Number(category_id), store_id: store.id },
      });
      if (!category) {
        res.status(400).json({
          success: false,
          message: "Category not found or access denied",
        });
        return;
      }
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
        stock: Number(stock) || 0,
        images: Array.isArray(images) ? images : [],
        variants: Array.isArray(variants) ? variants : [],
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

    const { id } = req.params;
    const existing = await prisma.products.findFirst({
      where: { id: Number(id), store_id: store.id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Product not found or access denied",
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
      images,
      variants,
      status = "active",
    } = req.body;

    if (category_id) {
      const category = await prisma.categories.findFirst({
        where: { id: Number(category_id), store_id: store.id },
      });
      if (!category) {
        res.status(400).json({
          success: false,
          message: "Category not found or access denied",
        });
        return;
      }
    }

    if (!name || price === undefined) {
      res.status(400).json({
        success: false,
        message: "Product name and price are required",
      });
      return;
    }

    const updated = await prisma.products.update({
      where: { id: Number(id) },
      data: Object.fromEntries(
        Object.entries({
          name: name !== undefined ? name.trim() : undefined,
          description,
          price: price !== undefined ? Number(price) : undefined,
          compare_at_price:
            compare_at_price !== undefined
              ? compare_at_price
                ? Number(compare_at_price)
                : null
              : undefined,
          sku,
          stock: stock !== undefined ? Number(stock) : undefined,
          category_id:
            category_id !== undefined
              ? category_id
                ? Number(category_id)
                : []
              : null,
          images:
            images !== undefined
              ? Array.isArray(images)
                ? images
                : []
              : undefined,
          variants:
            variants !== undefined
              ? Array.isArray(variants)
                ? variants
                : []
              : undefined,
          status,
        }).filter(([, v]) => v !== undefined),
      ),
    });

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updated,
    });
  } catch (error: any) {
    console.error("updateProduct error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update product" });
  }
};

// Delete existing Product
export const deleteProduct = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const store = await getMerchantStore(req.user!.id);
    if (!store) {
      res.status(404).json({
        success: false,
        message: "Store not found",
      });
      return;
    }
    const deleted = await prisma.products.deleteMany({
      where: { id: Number(req.params.id), store_id: store.id },
    });

    if (deleted.count === 0) {
      res.status(404).json({
        success: false,
        message: "Product not found or access denied",
      });
      return;
    }

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error: any) {
    console.error("deleteProduct error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete product" });
  }
};
