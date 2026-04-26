import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export function verifyLoggedIn(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.header("authorization");

        if (!authHeader) {
            return res.status(401).json({ message: "Missing authorization header" });
        }

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Invalid authorization format" });
        }

        const token = authHeader.substring(7);

        const decodedUser = jwt.verify(
            token,
            process.env.JWT_SECRET || "default_secret"
        );

        (req as any).user = decodedUser;

        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}