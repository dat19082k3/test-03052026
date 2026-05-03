# Inventory Frontend (Next.js)

A modern, responsive dashboard for the Inventory Management System. This application serves as both the user-facing interface and a **Backend-for-Frontend (BFF)** layer, providing a secure and optimized experience.

---

## 🚀 Overview

The frontend is built with **Next.js 14** using the **App Router** for optimal performance and SEO. It communicates with the core Backend API while handling session management, routing, and UI-specific orchestrations.

### Core Features:
- **Comprehensive Dashboard**: Real-time overview of inventory levels and voucher statuses.
- **Voucher Management**: Full CRUD operations for inventory vouchers with complex filtering.
- **Bulk Data Operations**: Seamless integration with the Worker service for Excel importing and exporting.
- **Secure Authentication**: Robust session handling and role-based access control.
- **Responsive Design**: Mobile-first UI built with Tailwind CSS and ShadcnUI.

---

## 🛠 Tech Stack

- **Framework**: Next.js 14 (TypeScript)
- **Styling**: Tailwind CSS, Lucide Icons
- **UI Components**: Radix UI / ShadcnUI
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form, Zod
- **Testing**: Vitest, React Testing Library

---

## ⚙️ Environment Variables

Ensure these are set in your `.env` or `.env.local` file:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Endpoint for the core Backend API | `http://localhost:4000/api` |
| `NEXTAUTH_SECRET` | Secret for session encryption | - |
| `NEXTAUTH_URL` | Canonical URL of the application | `http://localhost:3000` |

---

## 🏃‍♂️ Getting Started

### Development
```bash
# Install dependencies (from root)
npm install

# Start the dev server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build
```bash
# Build the application
npm run build

# Start the optimized server
npm run start
```

---

## 🏗 Architecture & BFF

This app implements the **Backend-for-Frontend** pattern:
1. **Server Components**: Directly fetch data for initial page load where possible.
2. **API Routes**: Proxy complex or sensitive requests to the Backend API.
3. **Optimized Payloads**: Transfoms raw backend data into UI-ready shapes to reduce client-side overhead.

---

## 🧪 Quality Assurance

- **Linting**: Standardized via shared `@repo/eslint-config`.
- **Testing**:
  ```bash
  npm run test
  ```
- **Type Checking**:
  ```bash
  npm run check-types
  ```

---

## 📦 Deployment

The frontend is containerized for production. It is recommended to deploy alongside the backend and worker services using the root `docker-compose.yml`.

> [!TIP]
> For best performance, ensure `NEXT_PUBLIC_API_URL` is set to the internal Docker network address when running in production containers.
