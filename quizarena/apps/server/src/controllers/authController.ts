import type { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";

const JWT_SECRET = process.env.JWT_SECRET || "quizarena_secret_key_12345";
const COOKIE_NAME = "quizarena_token";

/**
 * Register a new user
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body;

    // Validate inputs
    if (!username || !email || !password) {
      res.status(400).json({ message: "Todos los campos (username, email, password) son requeridos." });
      return;
    }

    if (username.length < 3 || username.length > 15) {
      res.status(400).json({ message: "El nombre de usuario debe tener entre 3 y 15 caracteres." });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username } },
          { email: { equals: email } },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        res.status(400).json({ message: "El nombre de usuario ya está registrado." });
        return;
      }
      res.status(400).json({ message: "El correo electrónico ya está registrado." });
      return;
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create user in DB
    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    // Generate JWT and log in automatically
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Set cookie
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${token}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax`
    );

    res.status(201).json({
      message: "Registro exitoso",
      user,
    });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Error interno del servidor al registrar." });
  }
}

/**
 * Log in an existing user
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      res.status(400).json({ message: "Nombre de usuario/email y contraseña son requeridos." });
      return;
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: usernameOrEmail } },
          { email: { equals: usernameOrEmail.toLowerCase() } },
        ],
      },
    });

    if (!user) {
      res.status(401).json({ message: "Credenciales incorrectas." });
      return;
    }

    // Check password
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Credenciales incorrectas." });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Set HTTP-Only Cookie
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${token}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax`
    );

    res.status(200).json({
      message: "Sesión iniciada con éxito",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error interno del servidor al iniciar sesión." });
  }
}

/**
 * Log out user (clear cookie)
 */
export async function logout(req: Request, res: Response): Promise<void> {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
  res.status(200).json({ message: "Sesión cerrada correctamente." });
}

/**
 * Get profile of current authenticated user
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ message: "No autorizado." });
    return;
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    if (!dbUser) {
      res.status(404).json({ message: "Usuario no encontrado." });
      return;
    }

    res.status(200).json({ user: dbUser });
  } catch (error: any) {
    console.error("GetProfile error:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
}
