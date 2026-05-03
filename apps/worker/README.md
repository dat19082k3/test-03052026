# Inventory Worker

A background worker service built with **BullMQ** to handle asynchronous tasks for the inventory system.

## Overview

The worker processes jobs from the `inventory-excel` queue. Currently, it supports:
- **Exporting Vouchers**: Generates Excel files from inventory voucher data based on filters (status, date range).
- **Importing Vouchers**: Processes Excel files to bulk import or update inventory vouchers.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Task Queue**: [BullMQ](https://docs.bullmq.io/) (Redis-backed)
- **Database**: PostgreSQL (via shared repository)
- **Excel Processing**: [ExcelJS](https://github.com/exceljs/exceljs)
- **Logging**: [Pino](https://github.com/pinojs/pino)

## Prerequisites

- Node.js 20+
- Redis server
- PostgreSQL database

## Setup

1.  **Environment Variables**:
    Create a `.env` file based on `.env.example`:
    ```bash
    cp .env.example .env
    ```

2.  **Configuration**:
    Ensure the following variables are set:
    - `REDIS_HOST`, `REDIS_PORT`: Connection details for Redis.
    - `DATABASE_URL`: Connection string for PostgreSQL.
    - `CONCURRENCY`: Number of jobs to process in parallel (default: 1).

## Development

Run with hot-reload:
```bash
npm run dev
```

Build the project:
```bash
npm run build
```

## Production

Start the built service:
```bash
npm start
```

## Job Types

| Job Name | Description | Data Parameters |
| :--- | :--- | :--- |
| `export-vouchers` | Generates Excel export | `status`, `startDate`, `endDate` |
| `import-vouchers` | Processes Excel import | `filePath` |

## Monitoring

The worker logs its activities using Pino. In development, logs are formatted with `pino-pretty`. In production, they are output as JSON for ingestion by log management systems.
