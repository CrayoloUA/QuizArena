import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "quizarena_secret_key_12345";
const COOKIE_NAME = "quizarena_token";

// Helper function to manually parse cookies from header string
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURI(parts.join("="));
    }
  });

  return list;
}

/**
 * Express middleware to extract and verify JWT from HTTP-only cookie or Authorization header.
 * Attaches decoded user payload to req.user. Does not block requests without token.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    let token: string | undefined = undefined;

    // 1. Try to get token from cookies
    const cookies = parseCookies(req.headers.cookie);
    if (cookies[COOKIE_NAME]) {
      token = cookies[COOKIE_NAME];
    }

    // 2. Try to get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      (req as any).user = decoded;
    }
  } catch (error) {
    // If token expired or is invalid, just don't attach user.
    // The requireAuth middleware will handle blocking if necessary.
    console.warn("Auth token extraction failed:", (error as Error).message);
  }
  next();
}

/**
 * Express middleware to block requests if user is not authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!(req as any).user) {
    res.status(401).json({ message: "No autorizado. Se requiere iniciar sesión." });
    return;
  }
  next();
}

/**
 * Socket.io middleware to authenticate connections
 */
export function socketAuthMiddleware(socket: any, next: (err?: Error) => void): void {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    const cookies = parseCookies(cookieHeader);
    const token = cookies[COOKIE_NAME];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.data.user = decoded; // Attach user to socket data
    } else {
      socket.data.user = null; // Unauthenticated connection (guest)
    }
    next();
  } catch (error) {
    // We don't block the socket connection on invalid token (allow guests), 
    // just treat them as unauthenticated.
    socket.data.user = null;
    next();
  }
}
