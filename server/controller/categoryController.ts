import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";

const getStore = async (merchantid: string) => {
  return await prisma.stores.findFirst({ where: { merchant_id: merchantid } });
};

const generateSlug = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "");
};

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
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch categories",
    });
  }
};

export const createCategory = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const store = await getStore(req.user!.id);
    if (!store) {
      res.status(404).json({
        success: false,
        message: "Store not found",
      });
      return;
    }
    const { name } = req.body;
    if (!name.trim()) {
      res.status(400).json({
        success: false,
        message: "Category name is required",
      });
      return;
    }

    const category = await prisma.categories.create({
      data: { store_id: store.id, name: name.trim(), slug: generateSlug(name) },
    });

    res.status(201).json({success: true,message: "Category created",category})
  } catch (error: any) {
    console.error("getCatergories error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch categories",
    });
  }
};

export const deleteCategory = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {};
