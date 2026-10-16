import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createStore,
  getAllMerchants,
  getAllStore,
  getMyStore,
  onboardMerchant,
  toggleStoreStatus,
  updateMyStore,
} from "../controller/storeController.js";

const storeRouter = Router();

// Merchant rotuer
storeRouter.post("/", requireAuth, createStore);
storeRouter.post("/onboard-merchant", requireAuth, onboardMerchant);
storeRouter.get("/me", requireAuth, getMyStore);
storeRouter.put("/me", requireAuth, updateMyStore);

// Platform Admin routes
storeRouter.get("/admin/all", requireAuth, requireRole(["admin"]), getAllStore);
storeRouter.get(
  "/admin/merchants",
  requireAuth,
  requireRole(["admin"]),
  getAllMerchants,
);
storeRouter.get(
  "/admin/:storeId/stats",
  requireAuth,
  requireRole(["admin"]),
  toggleStoreStatus,
);

export default storeRouter