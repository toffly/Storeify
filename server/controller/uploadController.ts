import { Request, Response } from "express";

// Upload single image
export const uploadSingle = async (req:Request, res: Response): Promise<void> => {
    try {
        if(!req.file){
            res.status(400).json({success: false, message: "No image file provided"})
            return
        }
    } catch (error) {
        
    }
}

// Upload multiple image in parallel
export const uploadMultiple = async (req:Request, res: Response): Promise<void> => {
    
}

// AI Transformation (Generative Recolor & background Removal)
export const aiTransform = async (req:Request, res: Response): Promise<void> => {
    
}

// Controller endpoint for On-Model catalog photography / virtual try-on
export const aiOnModel = async (req:Request, res: Response): Promise<void> => {

    
}