import { Router } from "express";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { createOrder, getCustomerOrders, getMerchantOrders, getOrderReceipt, updateorderStatus } from "../controller/orderController.js";

const orderRouter = Router()

// Public checkout & receipts
orderRouter.post("/checkout", optionalAuth, createOrder)
orderRouter.get("/receipt/:orderIdentifier", getOrderReceipt)

// Customer order history
orderRouter.get("/customer/my-orders", requireAuth, getCustomerOrders)

// Merchant orders
orderRouter.get("/merchant", requireAuth, requireRole(["merchant"]), getMerchantOrders)
orderRouter.patch("/merchant/:id/status", requireAuth, requireRole(["merchant"]), updateorderStatus)

export default orderRouter