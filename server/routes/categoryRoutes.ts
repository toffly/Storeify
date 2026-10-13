import { Router } from "express";
import {
  createCategory,
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
  getCategories,
);

export default categoryRouter
