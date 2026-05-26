# 🎮 QuizArena

Plataforma de trivia multijugador en tiempo real. Los jugadores compiten en salas respondiendo preguntas por categorías, acumulando puntos y viendo su posición en el ranking al instante.

---

## 🛠️ Tecnologías utilizadas

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | Express.js, TypeScript, Socket.IO |
| Base de datos | SQLite (desarrollo) vía Prisma ORM |
| Autenticación | JSON Web Tokens (JWT) + bcrypt |
| Monorepo | pnpm workspaces |

---

## ✅ Requisitos previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:

- **Node.js** v18 o superior → [https://nodejs.org](https://nodejs.org)
- **pnpm** v8 o superior

Si no tienes `pnpm`, instálalo con:

```bash
npm install -g pnpm
```

---

## 🚀 Instrucciones para correr el proyecto

### 1. Clonar el repositorio

```bash
git clone https://github.com/CrayoloUA/QuizArena.git
cd QuizArena/quizarena
```

### 2. Instalar dependencias

Desde la carpeta `quizarena/`, ejecuta:

```bash
pnpm install
```

Este comando instala las dependencias de todos los paquetes del monorepo (frontend y backend) al mismo tiempo.

### 3. Configurar variables de entorno

Crea un archivo `.env` dentro de `apps/server/`:

```bash
# quizarena/apps/server/.env
JWT_SECRET=tu_clave_secreta_aqui
DATABASE_URL="file:./dev.db"
```

> ⚠️ El archivo `.env` no está incluido en el repositorio por seguridad. Debes crearlo manualmente.

### 4. Preparar la base de datos

Desde la carpeta `quizarena/`, ejecuta las migraciones de Prisma:

```bash
pnpm --filter @quizarena/server db:generate
pnpm --filter @quizarena/server db:migrate
```

Esto creará el archivo `dev.db` con todas las tablas necesarias.

### 5. Correr el proyecto completo

Para iniciar el **frontend y el backend al mismo tiempo**:

```bash
pnpm dev
```

O si prefieres iniciarlos por separado:

```bash
# Solo el servidor (Express + Socket.IO)
pnpm dev:server

# Solo el frontend (Next.js)
pnpm dev:web
```

### 6. Abrir en el navegador

Una vez iniciado, accede a:

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend (API):** [http://localhost:3001](http://localhost:3001) *(puerto por defecto)*

---

## 📁 Estructura del proyecto

```
QuizArena/
└── quizarena/               ← raíz del monorepo
    ├── apps/
    │   ├── web/             ← Frontend (Next.js)
    │   └── server/          ← Backend (Express + Socket.IO)
    │       └── prisma/      ← Esquema y migraciones de BD
    ├── packages/            ← Código compartido entre apps
    ├── package.json
    └── pnpm-workspace.yaml
```

---

## 🗄️ Base de datos

El proyecto usa **SQLite** en desarrollo, gestionado por **Prisma ORM**. Los modelos principales son:

- `User` – jugadores registrados
- `Question` – preguntas del trivia con categoría y dificultad
- `Match` – partidas con código de sala
- `MatchParticipant` – relación jugador-partida con puntaje y ranking

Para inspeccionar la base de datos visualmente:

```bash
pnpm --filter @quizarena/server db:studio
```

---

## ⚡ Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia frontend y backend en paralelo |
| `pnpm dev:web` | Solo el frontend Next.js |
| `pnpm dev:server` | Solo el servidor Express |
| `pnpm build` | Compila todos los paquetes |
| `pnpm --filter @quizarena/server db:migrate` | Aplica migraciones de BD |
| `pnpm --filter @quizarena/server db:studio` | Abre Prisma Studio |
