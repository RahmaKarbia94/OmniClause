import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db";

const router = Router();
const VALID_ROLES = ["admin", "manager", "operator"];

// NOTE: open self-registration with a caller-chosen role is a known,
// deliberate simplification for early development/testing. Before any
// real deployment, this must become admin-only user creation (or a
// signup flow that defaults to the lowest-privilege role and requires
// an existing admin to promote it) -- tracked as a follow-up, not
// silently left as-is.
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    res.status(400).json({ status: "error", error: "email, password, and role are required" });
    return;
  }
  if (!VALID_ROLES.includes(role)) {
    res.status(400).json({ status: "error", error: `role must be one of ${VALID_ROLES.join(", ")}` });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING user_id, email, role, created_at`,
      [email, passwordHash, role]
    );
    res.status(201).json({ status: "success", data: result.rows[0] });
  } catch (error) {
    const pgError = error as { code?: string; message: string };
    if (pgError.code === "23505") {
      res.status(409).json({ status: "error", error: "Email already registered" });
      return;
    }
    console.error("[auth] Register failed:", pgError.message);
    res.status(500).json({ status: "error", error: "Failed to register user" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ status: "error", error: "email and password are required" });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[auth] JWT_SECRET is not set");
    res.status(500).json({ status: "error", error: "Server auth configuration error" });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT user_id, email, password_hash, role FROM users WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];

    // Same generic message whether the email doesn't exist or the
    // password is wrong -- avoids leaking which emails are registered.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ status: "error", error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      secret,
      { expiresIn: "24h" }
    );

    res.status(200).json({ status: "success", data: { token } });
  } catch (error) {
    console.error("[auth] Login failed:", (error as Error).message);
    res.status(500).json({ status: "error", error: "Failed to log in" });
  }
});

export default router;
