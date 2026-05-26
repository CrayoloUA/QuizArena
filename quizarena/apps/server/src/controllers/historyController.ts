import type { Request, Response } from "express";
import { prisma } from "../prisma";

/**
 * GET /api/history
 * Fetches the game history (matches joined and ranks) for the current authenticated user.
 */
export async function getHistory(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  
  if (!user) {
    res.status(401).json({ message: "No autorizado. Inicie sesión para ver el historial." });
    return;
  }

  try {
    // Query MatchParticipant records for current user
    const history = await prisma.matchParticipant.findMany({
      where: { userId: user.id },
      orderBy: {
        id: "desc", // Latest matches first
      },
      include: {
        match: {
          include: {
            _count: {
              select: { participants: true },
            },
          },
        },
      },
    });

    // Format final log response
    const formattedHistory = history.map((entry) => ({
      matchId: entry.matchId,
      roomCode: entry.match.roomCode,
      category: entry.match.category,
      score: entry.score,
      rank: entry.rank,
      totalPlayers: entry.match._count.participants,
      createdAt: entry.match.createdAt,
    }));

    res.status(200).json({
      history: formattedHistory,
    });
  } catch (error: any) {
    console.error("getHistory error:", error);
    res.status(500).json({ message: "Error interno al obtener el historial de partidas." });
  }
}
