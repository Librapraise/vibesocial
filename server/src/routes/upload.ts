import { Router, Request, Response } from "express";
import multer from "multer";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { env } from "../config/env";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Use memory storage — file goes to Supabase Storage, not disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(env.MAX_UPLOAD_SIZE) }, // 10 MB default
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
    } else {
      cb(null, true);
    }
  },
});

/**
 * POST /api/upload
 * Upload an image to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
router.post(
  "/",
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError("No file provided", 400);

    const ext = path.extname(req.file.originalname) || ".jpg";
    const filename = `${req.user!.id}/${uuidv4()}${ext}`;
    const bucket = "vibesocial-uploads";

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) throw new AppError(`Upload failed: ${error.message}`, 500);

    const { data: publicData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);

    res.json({ file_url: publicData.publicUrl });
  })
);

export default router;
