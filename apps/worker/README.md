# Inventory Worker

A high-performance background processing service built with **BullMQ** and **TypeScript**. This service handles asynchronous, resource-intensive tasks for the Inventory Management System, ensuring the main API remains responsive and stable.

---

## 🚀 Key Features

- **Asynchronous Task Processing**: Handles long-running jobs outside the request-response cycle.
- **Reliable Queuing**: Built on top of **Redis** via BullMQ for guaranteed job delivery and re-attempts.
- **Excel Orchestration**: Robust processing of large Excel files for bulk data operations.
- **Distributed Scaling**: Multiple worker instances can be deployed to scale horizontally.

---

## 🛠 Tech Stack

- **Runtime**: Node.js 20+ (TypeScript)
- **Queue Management**: [BullMQ](https://docs.bullmq.io/)
- **Data Stores**: PostgreSQL (Persistence), Redis (Job State)
- **File Handling**: [ExcelJS](https://github.com/exceljs/exceljs)
- **Storage Integration**: AWS S3 / LocalStack
- **Logging**: [Pino](https://github.com/pinojs/pino)

---

## ⚙️ Configuration

The worker behavior is controlled via environment variables.

### General Settings
| Variable | Description | Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment (development/production) | `development` |
| `CONCURRENCY` | Number of jobs to process simultaneously | `1` |
| `REDIS_HOST` | Redis server hostname | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `DATABASE_URL` | PostgreSQL connection string | - |

### S3 / Cloud Storage Settings
| Variable | Description | Default |
| :--- | :--- | :--- |
| `S3_BUCKET` | Destination bucket for exports/imports | - |
| `S3_ENDPOINT` | Custom endpoint (e.g., LocalStack) | - |
| `AWS_REGION` | AWS Region | `ap-southeast-1` |

---

## 🏃‍♂️ Development & Operations

### Local Development
```bash
# Install dependencies (from root)
npm install

# Start with hot-reload
npm run dev
```

### Production Build
```bash
# Build the TypeScript project
npm run build

# Start the optimized worker
npm run start
```

---

## 📋 Job Types & Logic

The worker listens on the `inventory-excel` queue for the following job types:

### 1. `export-vouchers`
Generates a downloadable Excel file of inventory vouchers based on specific filters.
- **Input Content**: `filters` (status, dateRange), `requestedBy`.
- **Outcome**: Generates `.xlsx` file, uploads to S3, and marks export as completed.

### 2. `import-vouchers`
Processes an uploaded Excel file to update the inventory system.
- **Input Content**: `s3Key` or `filePath`.
- **Outcome**: Validates data, performs bulk updates in DB, and reports success/failure count.

---

## ☁️ Local S3 Simulation (LocalStack)

For local development, we use **LocalStack** to emulate AWS S3.

### Setup Steps:
1. **Ensure LocalStack is running**:
   ```bash
   # If using the project's docker-compose.yml
   docker compose up -d localstack
   ```
2. **Configure Environment**:
   ```env
   AWS_ACCESS_KEY_ID=test
   AWS_SECRET_ACCESS_KEY=test
   S3_ENDPOINT=http://localhost:4566
   S3_FORCE_PATH_STYLE=true
   S3_BUCKET=inventory-vouchers
   ```
3. **Manual Bucket Creation (If needed)**:
   ```bash
   aws --endpoint-url=http://localhost:4566 s3 mb s3://inventory-vouchers
   ```

---

## 📊 Monitoring & Reliability

- **Health Checks**: The worker reports its status via internal heartbeat.
- **Graceful Shutdown**: Listens for system signals to finish active jobs before exiting.
- **Error Handling**: Automatically retries failed jobs with exponential backoff if configured in BullMQ.
- **Log Management**: Standardized JSON logs via Pino for ELK/CloudWatch integration.
