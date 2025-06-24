import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
    clinicId?: number;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  storage.getUser(userId).then(user => {
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user.id,
      role: user.role,
      clinicId: user.clinicId || undefined,
    };

    next();
  }).catch(err => {
    console.error("Auth middleware error:", err);
    res.status(500).json({ message: "Authentication error" });
  });
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}
