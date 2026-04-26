# Full-Stack Application (Turborepo)

This project is a Full-Stack system organized as a monorepo (using Turborepo), consisting of a Frontend application (Next.js) and a Backend application (Express.js).

## 🛠 Tech Stack

### Frontend (`apps/frontend` / `web`)
- **Framework:** Next.js 16 (with TypeScript, acting as BFF).
- **Form Management & Validation:** React Hook Form, Zod.
- **Styling:** Tailwind CSS, shadcn/ui.

### Backend (`apps/backend` / `backend`)
- **Runtime & Framework:** Node.js, Express.js.
- **Language:** TypeScript.
- **Database:** PostgreSQL.
- **Database Client:** `pg` package (node-postgres) with Connection Pool configuration.
- **Security & Logging:** Helmet, CORS, express-rate-limit, morgan, winston.
- **Schema Management:** `node-pg-migrate`.

### DevOps & CI/CD
- **Containerization:** Docker & Docker Compose (for local development environment).
- **CI/CD:** Bitbucket Pipelines (for automated testing, linting, and building).
- **Testing:** Jest, Supertest, pg-mem (in-memory DB for unit tests).

---

## 🚀 Installation & Setup Guide

### Method 1: Running with Docker (Recommended)
If you have Docker and Docker Compose installed on your machine, you only need to run a single command from the root directory:

```bash
docker compose up --build -d
```
- The **Frontend** will be running at: [http://localhost:3000](http://localhost:3000)
- The **Backend API** will be running at: [http://localhost:4000](http://localhost:4000)
- The PostgreSQL **Database** will be automatically initialized.

### Method 2: Running Locally (NPM / Turbo)
If you prefer to run the applications directly using Node.js:

1. **Install dependencies (from the root directory):**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Ensure you have a PostgreSQL database running locally and update the `DATABASE_URL` environment variables in the respective `.env` files (or keep the defaults if they match your local PostgreSQL configuration).

3. **Run both Frontend and Backend concurrently using Turbo:**
   ```bash
   npm run dev
   ```
   This command starts the `apps/frontend` module (on port 3000) and the `apps/backend` module (on port 4000).

---

## 🧪 Testing

To run Unit Tests (including database mock tests with `pg-mem`), execute the following command from the root directory:

```bash
npm run test -w backend
```
Alternatively, test the entire project by executing the CI workflow scripts:
```bash
npm run lint && npm run check-types
```
