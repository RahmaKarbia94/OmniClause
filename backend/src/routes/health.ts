import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.status(200).json({
      status: "ok",
      database: "connected",
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    console.error("[health] Database check failed:", message);
    res.status(500).json({
      status: "degraded",
      database: "disconnected",
      error: message,
    });
  }
});

export default router;
