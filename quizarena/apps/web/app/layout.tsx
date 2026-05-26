import type { Metadata } from "next";
import { AuthInit } from "@/components/AuthInit";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizArena — Trivia Multiplayer en Tiempo Real",
  description:
    "Compite en trivia en tiempo real con jugadores de todo el mundo. Crea salas, responde preguntas y escala en el ranking.",
  keywords: ["trivia", "multiplayer", "quiz", "tiempo real", "juego"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg-primary antialiased">
        <AuthInit />
        <div className="min-h-dvh flex flex-col">{children}</div>
      </body>
    </html>
  );
}
