import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";

// Create a new store ( for authenticated merchant )
export const createStore = async (req:AuthenticatedRequest, res: Response) => {
    
}

// Get authenticated merchant's store
export const getMyStore = async (req:AuthenticatedRequest, res: Response) => {
    
}

// onboard or elevate user to merchant role
export const onboardMerchant = async (req:AuthenticatedRequest, res: Response) => {
    
}

// Update merchant's store settings
export const updateMyStore = async (req:AuthenticatedRequest, res: Response) => {
    
}

// Platform Admin: Get all stores with stats
export const getAllStore = async (_req:AuthenticatedRequest, res: Response) => {
    
}

// Platform Admin: Get all merchants
export const getAllMerchants = async (req:AuthenticatedRequest, res: Response) => {
    
}

// Platform Admin: Toggle store status ( active / suspended )
export const toggleStoreStatus = async (req:AuthenticatedRequest, res: Response) => {
    
}