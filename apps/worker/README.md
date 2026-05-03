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

## Cấu hình AWS S3 Local (LocalStack)

Để phát triển và kiểm thử các chức năng lưu trữ S3 trên môi trường local, bạn có thể sử dụng [LocalStack](https://github.com/localstack/localstack) để giả lập AWS S3.

### Cài đặt LocalStack

1. **Cài đặt Docker** (nếu chưa có): https://docs.docker.com/get-docker/
2. **Chạy LocalStack bằng Docker:**
   ```bash
   docker run --rm -it -p 4566:4566 -p 4571:4571 localstack/localstack
   ```
   Hoặc dùng docker-compose:
   ```yaml
   services:
     localstack:
       image: localstack/localstack
       ports:
         - "4566:4566"
       environment:
         - SERVICES=s3
         - DEBUG=1
   ```

### Tạo bucket S3 trên LocalStack

```bash
aws --endpoint-url=http://localhost:4566 s3 mb s3://ten-bucket-cua-ban
```

### Thiết lập biến môi trường cho worker

Thêm vào file `.env`:
```
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=ap-southeast-1
S3_BUCKET=ten-bucket-cua-ban
S3_ENDPOINT=http://localhost:4566
S3_FORCE_PATH_STYLE=true
```

### Kiểm tra kết nối

Chạy thử upload/download file với endpoint S3 local để đảm bảo worker kết nối thành công.

> Tham khảo thêm: https://docs.localstack.cloud/user-guide/aws/s3/
