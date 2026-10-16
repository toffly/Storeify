import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";

// Created new order
export const createOrder = async (req: AuthenticatedRequest, res: Response) : Promise<void> => {

}

// Get merchant orders
export const getMerchantOrders = async (req: AuthenticatedRequest, res: Response) : Promise<void> => {

}

// Update order status
export const updateorderStatus = async (req: AuthenticatedRequest, res: Response) : Promise<void> => {

}

// Get order receipt
export const getOrderReceipt = async (req: AuthenticatedRequest, res: Response) : Promise<void> => {

}