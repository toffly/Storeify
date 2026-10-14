import { Request, Response } from "express";
import cloudinary from "../config/cloudinary.js";

export const optimizeDeliveryUrl = (url: string): string => {
  if (!url || typeof url !== "string" || url.includes(".svg")) return url;
  return url.replace(
    /\/image\/upload\/(?!f_auto,q_auto\/)/,
    "/image/upload/f_auto,q_auto/",
  );
};

export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  folder: string = "storeify",
  options: { mimetype?: string; filename?: string } = {},
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const isSvg =
      options.mimetype === "image/svg+xml" ||
      options.filename?.endsWith(".svg");
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        ...(isSvg ? { format: "svg" } : {}),
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Upload failed"));
        } else {
          resolve(
            isSvg ? result.secure_url : optimizeDeliveryUrl(result.secure_url),
          );
        }
      },
    );
    uploadStream.end(fileBuffer);
  });
};

// Upload single image
export const uploadSingle = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.file) {
      res
        .status(400)
        .json({ success: false, message: "No image file provided" });
      return;
    }

    const url = await uploadToCloudinary(req.file.buffer, "storeify", {
      mimetype: req.file.mimetype,
      filename: req.file.originalname,
    }).catch(
      () =>
        `data: ${req.file!.mimetype};base64,${req.file!.buffer.toString("base64")}`,
    );

    res.json({ success: true, url });
  } catch (error: any) {
    console.log(error?.message)
    res.status(500).json({ success: false, message: "Image upload failed" });
  }
};

// Upload multiple image in parallel
export const uploadMultiple = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];

    if (!files.length) {
      res
        .status(400)
        .json({ success: false, message: "No image file provided" });
      return;
    }

    const urls = await Promise.all(
      files.map((file) => {
        uploadToCloudinary(file.buffer, "storeify", {
          mimetype: file.mimetype,
          filename: file.originalname,
        }).catch(
          () =>
            `data: ${file!.mimetype};base64,${file!.buffer.toString("base64")}`,
        );
      }),
    );

    res.json({ success: true, urls });
  } catch (error: any) {
    console.log(error?.message)
    res.status(500).json({ success: false, message: "Image upload failed" });
  }
};

// AI Transformation (Generative Recolor & background Removal)
export const aiTransform = async (
  req: Request,
  res: Response,
): Promise<void> => {};

// Controller endpoint for On-Model catalog photography / virtual try-on
export const aiOnModel = async (
  req: Request,
  res: Response,
): Promise<void> => {};
