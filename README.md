# 📄 System Design Document

**Project Name:** Distributed Order Aggregator\
**Tech Stack:** Node.js, Express, PostgreSQL, Sequelize, RabbitMQ\
**Author:** Danish Asghar
**Date:** April 2025

---

## 🛍️ Objective

The system is designed to aggregate stock data from multiple third-party vendors, store a local copy for fast access, and ensure reliable and consistent order processing using a queue-based worker model.

---

## 🏧 Architecture Overview

### 🔧 Components

| Component              | Description                                                               |
| ---------------------- | ------------------------------------------------------------------------- |
| **Vendor APIs**        | Mock external systems exposing product stock (e.g., `/vendorA/products`)  |
| **vendorsFetcher.js**  | Periodically fetches stock from vendors and pushes into the message queue |
| **externalToLocal.js** | Consumes stock updates and syncs normalized data into local PostgreSQL    |
| **localToExternal.js** | Consumes local order events and sends them to the respective vendor       |
| **index.js** (Routes)  | Exposes REST APIs like `/products`, `/order`, `/health`                   |
| **PostgreSQL**         | Stores normalized product and order data                                  |
| **RabbitMQ**           | Facilitates async processing and fault tolerance using queues and DLQs    |

---

## 🔄 Data Flow

### 1. **Stock Sync (Vendor → Local DB)**

```
Vendor APIs ──▶ vendorsFetcher ──▶ Queue (sync_from_external)
                          ▼
              externalToLocal Consumer
                          ▼
               Normalize & Save to DB
```

- Each product is enriched with vendor info and pushed to RabbitMQ
- Consumers normalize and upsert into PostgreSQL

---

### 2. **Order Placement (User → Vendor)**

```
Client ──▶ POST /order ──▶ Check & Update DB
                          ▼
                    Queue (sync_to_external)
                          ▼
              localToExternal Consumer
                          ▼
                Send PUT to Vendor API
```

- Orders are saved in the local DB, then pushed to the vendor via async workers
- Includes retry mechanism with DLQ after 3 attempts

---

## 📬 Messaging Queue Design (RabbitMQ)

| Queue Name             | Purpose                             | DLQ Support |
| ---------------------- | ----------------------------------- | ----------- |
| `sync_from_external`   | Sync vendor stock to local DB       | ✅           |
| `sync_to_external`     | Sync orders to external vendors     | ✅           |
| `sync_to_external_dlq` | Dead-letter queue for failed orders | ✅           |

- Rate-limiting is implemented using `Bottleneck` to prevent API overload
- Retries are handled with custom headers (`x-retry`) and DLQ fallback

---

## ⚖️ Consistency & Reliability

| Aspect                     | Implementation                                                   |
| -------------------------- | ---------------------------------------------------------------- |
| **Local Consistency**      | Handled via Sequelize updates (future: add transactions/locking) |
| **Vendor Sync**            | Periodic fetches ensure eventual consistency                     |
| **Order Sync Reliability** | Retry logic + DLQ                                                |
| **Duplicate Protection**   | `isDuplicate()` check before external sync                       |
| **Availability**           | Scalable consumers and queue-based decoupling                    |

---

## ✅ REST API Endpoints

| Method | Endpoint    | Description                                   |
| ------ | ----------- | --------------------------------------------- |
| `GET`  | `/products` | Lists locally stored products                 |
| `POST` | `/order`    | Places an order and queues it for vendor sync |
| `GET`  | `/health`   | Health check for DB and uptime                |
| `GET`  | `/`         | Welcome message                               |

---

## 🧪 Retry & Failure Handling

- Orders failing vendor sync are retried up to 3 times
- Failed messages are routed to `sync_to_external_dlq`
- Future enhancement: Dashboard for monitoring DLQ & metrics

---

## 🧱 Scalability & Extensibility

- Easily extendable to more vendors (just add API URLs in `.env`)
- Consumers can be horizontally scaled to handle more load
- Future additions:
  - Reconciliation job for inconsistencies
  - Dashboard (currently commented)

---

## 🔺 Summary

This system meets the goals of:

- **Asynchronous processing**
- **Reliable vendor integration**
- **Scalable architecture**
- **Retry and DLQ handling**

---

## 📘 README.md

### 📦 Setup

```bash
git clone <your-repo-url>
cd your-repo-directory
npm install
```

### ⚙️ Environment Variables

Create a `.env` file:

```
VENDOR_URL_1=https://vendor1.com/products
VENDOR_URL_2=https://vendor2.com/products
DB_URI=postgres://user:password@localhost:5432/dbname
RABBITMQ_URI=amqp://localhost
```

### 🚀 Start Application

```bash
npm run start:all
```

Ensure you have a `start-all.sh` file with execution permission that orchestrates your services.

### 🔍 Scripts

Add the following to your `package.json`:

```json
"scripts": {
  "start:all": "chmod +x ./start-all.sh && ./start-all.sh"
}
```

---

### 🧪 Testing

You can use tools like Postman to test:

#### 🧾 Example CURL to Place an Order

```bash
curl -X POST http://localhost:8000/order \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "vendor": "vendorA",
    "name": "Essence Mascara Lash Princess",
    "price": 9.99,
    "quantity": 1
  }'
```



- `GET /products`
- `POST /order`
- `GET /health`

---
