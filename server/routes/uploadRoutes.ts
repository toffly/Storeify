import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  aiOnModel,
  aiTransform,
  uploadMultiple,
  uploadSingle,
} from "../controller/uploadController.js";

const uploadRouter = Router();

uploadRouter.post("/single", requireAuth, upload.single("image"), uploadSingle);
uploadRouter.post(
  "/multiple",
  requireAuth,
  upload.array("image", 5),
  uploadMultiple,
);
uploadRouter.post("/ai-transform", requireAuth, aiTransform);
uploadRouter.post("/ai-on-model", requireAuth, aiOnModel);

export default uploadRouter;
