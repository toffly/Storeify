import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
} from "../controller/categoryController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const categoryRouter = Router();

categoryRouter.get("/", getCategories);
categoryRouter.post(
  "/",
  requireAuth,
  requireRole(["merchant"]),
  createCategory,
);
categoryRouter.delete(
  "/:id",
  requireAuth,
  requireRole(["merchant"]),
  deleteCategory,
);

export default categoryRouter
