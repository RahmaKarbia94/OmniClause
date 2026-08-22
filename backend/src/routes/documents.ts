import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { authenticateJWT, requireRole } from "../middleware/auth";
import { upload, UnsupportedFileTypeError } from "../middleware/upload";
import { extractText, chunkText } from "../utils/textProcessor";
import { pool } from "../db";

const router = Router();
const VALID_DOCUMENT_ROLES = ["admin", "manager", "operator", "public"];

router.post(
  "/upload",
  authenticateJWT,
  requireRole(["admin", "manager"]),
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ status: "error", error: "No file uploaded" });
      return;
    }

    const requiredRole = req.body.required_role;
    if (!requiredRole || !VALID_DOCUMENT_ROLES.includes(requiredRole)) {
      res.status(400).json({
        status: "error",
        error: `Invalid required_role. Must be one of ${VALID_DOCUMENT_ROLES.join(", ")}`,
      });
      return;
    }

    let text: string;
    try {
      text = await extractText(req.file.buffer, req.file.mimetype);
    } catch (error) {
      console.error("[documents] Text extraction failed:", (error as Error).message);
      res.status(500).json({ status: "error", error: "Failed to parse document" });
      return;
    }

    const chunks = chunkText(text);
    const metadata = { filename: req.file.originalname, chunk_count: chunks.length };

    try {
      const result = await pool.query(
        `INSERT INTO documents (content, metadata, required_role)
         VALUES ($1, $2, $3)
         RETURNING document_id, required_role, created_at`,
        [text, JSON.stringify(metadata), requiredRole]
      );
      const row = result.rows[0];
      res.status(201).json({
        status: "success",
        data: {
          document_id: row.document_id,
          filename: req.file.originalname,
          required_role: row.required_role,
          chunks_extracted: chunks.length,
          created_at: row.created_at,
        },
      });
    } catch (error) {
      console.error("[documents] Insert failed:", (error as Error).message);
      res.status(500).json({ status: "error", error: "Failed to save document" });
    }
  }
);

// Multer failures (fileFilter rejection, size-limit overflow) are
// raised as errors passed to next(), not thrown synchronously in the
// handler above -- this catches them and maps to the documented codes.
router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ status: "error", error: "Payload too large" });
    return;
  }
  if (err instanceof UnsupportedFileTypeError) {
    res.status(415).json({ status: "error", error: "Unsupported media type" });
    return;
  }
  next(err);
});

export default router;
