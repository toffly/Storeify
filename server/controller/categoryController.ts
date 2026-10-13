import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";

export const getCategories = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { storeId, storeSlug } = req.query;
    let targetStoreId: number | null = null;

    if (storeSlug) {
      const store = await prisma.stores.findUnique({
        where: { slug: storeSlug as string },
        select: { id: true },
      });
      if (!store) {
        res.status(404).json({ success: false, message: "Store not found" });
        return;
      }
      targetStoreId = store.id;
    } else if (storeId) {
      targetStoreId = Number(storeId);
    }

    if (!targetStoreId) {
      res
        .status(400)
        .json({ success: false, message: "storeId or storeSlug is required" });
      return;
    }

    const list = await prisma.categories.findMany({
      where: { store_id: targetStoreId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });

    const categories = list.map(({ _count, ...rest }) => ({
      ...rest,
      product_cout: _count.products,
    }));

    res.json({ success: true, categories });
  } catch (error: any) {
    console.error("getCatergories error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error?.message || "Failed to fetch categories",
      });
  }
};

export const createCategory = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {};

export const deleteCategory = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {};
