# QuizArena

Proyecto de trivia multijugador en tiempo real.

## Requisitos previos

- Node.js v18 o superior
- pnpm instalado globalmente

```bash
npm install -g pnpm
```

## Clonar el repositorio

```bash
git clone https://github.com/CrayoloUA/QuizArena.git
cd QuizArena/quizarena
```

## Instalar dependencias

Desde la carpeta `quizarena/` ejecutar:

```bash
pnpm install
```

## Configurar variables de entorno

Crear un archivo `.env` dentro de `apps/server/` con al menos:

```bash
# quizarena/apps/server/.env
JWT_SECRET=tu_clave_secreta_aqui
DATABASE_URL="file:./dev.db"
```

## Preparar la base de datos

Desde la carpeta `quizarena/` ejecutar:

```bash
pnpm --filter @quizarena/server db:generate
pnpm --filter @quizarena/server db:migrate
```

## Ejecutar el proyecto en desarrollo

Para levantar frontend y backend en paralelo:

```bash
pnpm dev
```

O por separado:

```bash
# Servidor (API + WebSocket)
pnpm dev:server

# Frontend (Next.js)
pnpm dev:web
```

## Acceso en el navegador

- Frontend: http://localhost:3000
- Backend (API): http://localhost:3001
