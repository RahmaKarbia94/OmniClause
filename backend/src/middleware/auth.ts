import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedUser {
  user_id: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Verifies the Bearer token in the Authorization header and attaches
 * the decoded user (user_id, email, role) to req.user. Does not touch
 * the database -- role checks against current DB state belong to
 * requireRole or the route handler, not here.
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ status: "error", error: "Missing or malformed Authorization header" });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[auth] JWT_SECRET is not set");
    res.status(500).json({ status: "error", error: "Server auth configuration error" });
    return;
  }

  try {
    req.user = jwt.verify(token, secret) as AuthenticatedUser;
    next();
  } catch {
    res.status(401).json({ status: "error", error: "Invalid or expired token" });
  }
}

/**
 * Must run after authenticateJWT. Rejects the request unless the
 * authenticated user's role is in allowedRoles.
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ status: "error", error: "Insufficient role permissions" });
      return;
    }
    next();
  };
}
