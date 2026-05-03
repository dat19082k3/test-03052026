# Inventory Voucher System (Monorepo)

This project is a modern Full-Stack Inventory Management System organized as a monorepo using **Turborepo**. It is designed for production readiness with automated migrations, background job processing, and containerized deployment.

## 🏗 System Architecture

The application follows a modular, distributed architecture:

- **Frontend (`apps/frontend`)**: A High-performance **Next.js** application. Acts as the primary user interface and a BFF (Backend for Frontend).
- **Backend (`apps/backend`)**: A robust **Node.js/Express** API service handling business logic, transactions, and inventory rules.
- **Worker (`apps/worker`)**: A background processor using **BullMQ** for long-running tasks like Excel import/export to keep the main API responsive.
- **Shared Packages (`packages/*`)**:
    - `@repo/db`: Centralized database schema, repositories, and migrations.
    - `@repo/types`: Shared TypeScript definitions across all apps.
    - `@repo/ui`: Shared design system components.
- **Infrastructure**:
    - **PostgreSQL**: Primary relational database.
    - **Redis**: Fast cache and message broker for BullMQ.

---

## 🚀 Environment Setup

The project uses a centralized environment variable management system.

1.  **Requirement**: Node.js 20+, Docker & Docker Compose.
2.  **Configuration**: Copy the root template to create your `.env` file:
    ```bash
    cp .env.example .env
    ```
    Populate the `DB_PASSWORD` and `REDIS_PASSWORD` variables as they are mandatory for security.

---

## 🛠 Development Guide

### Running Locally (NPM)
To run the entire stack locally for development:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Development Mode**:
    ```bash
    npm run dev
    ```
    Turbo will concurrently start the Frontend (3000), Backend (4000), and Worker.

### Running with Docker (Production Ready)
The Docker setup is hardened for security and production-like behavior:

1.  **Build and Start**:
    ```bash
    docker compose up --build -d
    ```
2.  **Automated Migrations**: The system includes a `migration` service that automatically updates your database schema before the backend or worker apps start.
3.  **Observability**: Logs are limited to 10MB per file with a 3-file rotation to prevent disk exhaustion.
4.  **Healthchecks**: All services include robust health monitoring.

---

## 💾 Database Management

- **Migrations**: Managed via `node-pg-migrate`. They run automatically in Docker.
- **Seeding Data**: To populate the database with test data (e.g., 1 million records):
    ```bash
    docker compose run --rm backend npm run seed:1m
    ```

---

## 🧪 Testing

The project emphasizes reliability through high test coverage (Jest/Supertest).

```bash
# Run backend tests
npm run test -w backend

# Unified linting and type checking
npm run lint
npm run check-types
```

---

## 🔒 Security Best Practices
- **Network Isolation**: Only Frontend and Backend ports are exposed. Database and Redis are isolated within an internal Docker network.
- **Secret Management**: No hardcoded secrets; mandatory environment variable enforcement.
- **Graceful Failover**: Services use `restart: unless-stopped` and wait for dependencies to be healthy.
