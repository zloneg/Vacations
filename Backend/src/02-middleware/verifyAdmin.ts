import { NextFunction, Request, Response } from "express";

export function verifyAdmin(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;

    if (!user) {
        return res.status(401).json({ message: "User not found in request" });
    }

    if (user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admins only" });
    }

    next();
}