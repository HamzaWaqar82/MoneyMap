# Personal Finance Analytics Dashboard — Backend API

## Project Report

**Course:** Advanced Web Technologies (AWT)  
**Assessment:** Midterm Lab — Express.js Application Implementation  
**Submitted By:**  
- Hamza Farooq (FA23-BSE-038)  
- Hamza (FA23-BSE-037)  

**Date:** April 2026  
**Technology Stack:** Node.js, Express.js 5, MongoDB (Mongoose 9), JWT Authentication

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Architecture](#2-project-architecture)
3. [Technology Stack & Dependencies](#3-technology-stack--dependencies)
4. [Database Design](#4-database-design)
5. [API Endpoints](#5-api-endpoints)
6. [Middleware Implementation](#6-middleware-implementation)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Validation Strategy](#8-validation-strategy)
9. [Error Handling & Response Format](#9-error-handling--response-format)
10. [MongoDB Aggregation Pipelines](#10-mongodb-aggregation-pipelines)
11. [Setup & Installation](#11-setup--installation)
12. [Testing Guide](#12-testing-guide)
13. [Conclusion](#13-conclusion)

---

## 1. Project Overview

The **Personal Finance Analytics Dashboard API** is a RESTful backend application built with Express.js and MongoDB for managing personal finances. It provides comprehensive features for:

- **User Authentication** — Secure registration and login with JWT tokens
- **Transaction Management** — Full CRUD for income and expense tracking
- **Budget Management** — Monthly category-based budgets with real-time spent tracking
- **Savings Goals** — Goal setting with contribution tracking and auto-completion
- **Reports & Analytics** — Advanced analytics using MongoDB aggregation pipelines
- **Notifications** — Budget alerts, goal reminders, and transaction confirmations

### Key Highlights
- 35+ API endpoints across 7 resource modules
- MongoDB aggregation pipelines for server-side analytics
- JWT-based stateless authentication
- Joi schema validation on all inputs
- Centralized error handling with typed error classes
- Rate limiting, CORS, and security headers (Helmet.js)

---

## 2. Project Architecture

The application follows the **MVC (Model-View-Controller)** architectural pattern with clear separation of concerns:

```
finance-dashboard-api/
├── src/
│   ├── app.js                          # Main application entry point
│   ├── config/
│   │   ├── database.js                 # MongoDB connection setup
│   │   └── env.js                      # Environment variable configuration
│   ├── models/                         # Mongoose schemas (5 models)
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── Budget.js
│   │   ├── SavingsGoal.js
│   │   └── Notification.js
│   ├── controllers/                    # Business logic (7 controllers)
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── transactionController.js
│   │   ├── budgetController.js
│   │   ├── goalController.js
│   │   ├── reportsController.js
│   │   └── notificationsController.js
│   ├── routes/                         # API route definitions (7 routers)
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── transactions.routes.js
│   │   ├── budgets.routes.js
│   │   ├── goals.routes.js
│   │   ├── reports.routes.js
│   │   └── notifications.routes.js
│   ├── middleware/                     # Custom middleware (6 files)
│   │   ├── auth.middleware.js          # JWT verification
│   │   ├── authorization.middleware.js # Resource ownership checks
│   │   ├── validation.middleware.js    # Generic Joi validator
│   │   ├── errorHandler.middleware.js  # Global error catcher
│   │   ├── logger.middleware.js        # Request logging
│   │   └── rateLimiter.middleware.js   # Rate limiting
│   ├── validators/                    # Joi validation schemas (5 files)
│   │   ├── authValidator.js
│   │   ├── userValidator.js
│   │   ├── transactionValidator.js
│   │   ├── budgetValidator.js
│   │   └── goalValidator.js
│   └── utils/                         # Utility functions (3 files)
│       ├── errorHandler.js            # Custom error classes
│       ├── responseFormatter.js       # Consistent response helpers
│       └── tokenGenerator.js          # JWT generation/verification
├── .env                               # Environment variables
├── package.json
└── README.md
```

### Request Flow

```
Client Request
    → Helmet (Security Headers)
    → CORS
    → Body Parser (JSON)
    → Logger Middleware (logs method, URL, status, duration)
    → Rate Limiter (100 req/15min per IP)
    → Route Handler
        → Auth Middleware (JWT verification)
        → Controller (business logic)
            → Validator (Joi schema)
            → Model (Mongoose operations)
        → Response Formatter (consistent JSON)
    → Error Handler Middleware (if error thrown)
```

---

## 3. Technology Stack & Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.2.1 | Web framework |
| mongoose | ^9.5.0 | MongoDB ODM |
| bcryptjs | ^3.0.3 | Password hashing (10 salt rounds) |
| jsonwebtoken | ^9.0.3 | JWT token generation/verification |
| joi | ^18.1.2 | Request body validation |
| helmet | ^8.1.0 | Security HTTP headers |
| cors | ^2.8.6 | Cross-Origin Resource Sharing |
| dotenv | ^17.4.2 | Environment variable management |
| express-validator | ^7.3.2 | Additional input validation |
| nodemon | ^3.1.14 | Development auto-restart (devDep) |

---

## 4. Database Design

### 4.1 User Schema

| Field | Type | Constraints |
|-------|------|-------------|
| fullName | String | Required, trim, 2–50 chars |
| email | String | Required, unique, lowercase, regex validated |
| passwordHash | String | Required, min 6 chars, `select: false` |
| role | String | Enum: `['user']`, default: `'user'` |
| currencyPreference | String | Enum: `['PKR','USD','EUR','GBP','AUD']`, default: `'PKR'` |
| createdAt / updatedAt | Date | Auto-managed by timestamps |

**Features:** Pre-save hook for bcrypt password hashing, `comparePassword()` instance method, `toJSON()` method excludes passwordHash.

### 4.2 Transaction Schema

| Field | Type | Constraints |
|-------|------|-------------|
| userId | ObjectId | Required, ref: User, indexed |
| type | String | Enum: `['income', 'expense']` |
| amount | Number | Required, min: 0.01 |
| category | String | Required, enum (16 predefined categories) |
| description | String | Optional, max 500 chars |
| transactionDate | Date | Required, default: now |
| paymentMethod | String | Enum: `['cash','card','bank_transfer']` |

**Categories:**  
- **Income:** Salary, Freelance, Investment, Bonus, Gift, Other Income  
- **Expense:** Food, Transport, Shopping, Utilities, Entertainment, Healthcare, Education, Rent, Insurance, Other Expense

**Indexes:** `{userId, transactionDate}`, `{userId, category}`, `{userId, type}`

### 4.3 Budget Schema

| Field | Type | Constraints |
|-------|------|-------------|
| userId | ObjectId | Required, ref: User |
| category | String | Required, enum (expense categories only) |
| monthlyLimit | Number | Required, min: 0.01 |
| spentAmount | Number | Default: 0, calculated via aggregation |
| remainingAmount | Number | Auto-calculated: `monthlyLimit - spentAmount` |
| month | String | Required, format: `YYYY-MM` (regex validated) |

**Unique Constraint:** Compound index on `{userId, category, month}` prevents duplicate budgets.  
**Pre-save Hook:** Auto-calculates `remainingAmount`.

### 4.4 SavingsGoal Schema

| Field | Type | Constraints |
|-------|------|-------------|
| userId | ObjectId | Required, ref: User |
| title | String | Required, trim, max 200 chars |
| targetAmount | Number | Required, min: 0.01 |
| currentAmount | Number | Default: 0 |
| deadline | Date | Required |
| status | String | Enum: `['active','completed','abandoned']` |
| progressPercentage | Number | Auto-calculated, 0–100 |

**Pre-save Hook:** Calculates `progressPercentage = (currentAmount/targetAmount)*100`, auto-sets status to `'completed'` when target is reached.

### 4.5 Notification Schema

| Field | Type | Constraints |
|-------|------|-------------|
| userId | ObjectId | Required, ref: User |
| type | String | Enum: `['budget_alert','goal_reminder','transaction_confirmation']` |
| message | String | Required, max 500 chars |
| isRead | Boolean | Default: false |

**Indexes:** `{userId, isRead}`, `{userId, createdAt}`

---

## 5. API Endpoints

### 5.1 Authentication — `/api/auth`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create new user account | ❌ |
| POST | `/api/auth/login` | Login and get JWT token | ❌ |

### 5.2 User Profile — `/api/users`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/profile` | Get current user profile | ✅ |
| PUT | `/api/users/profile` | Update profile/password | ✅ |
| DELETE | `/api/users/account` | Delete user account | ✅ |

### 5.3 Transactions — `/api/transactions`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/transactions` | Create transaction | ✅ |
| GET | `/api/transactions` | List all (filtered, paginated) | ✅ |
| GET | `/api/transactions/:id` | Get single transaction | ✅ |
| PUT | `/api/transactions/:id` | Update transaction | ✅ |
| DELETE | `/api/transactions/:id` | Delete transaction | ✅ |

**Query Filters:** `?category=Food&type=expense&startDate=2026-04-01&endDate=2026-04-30&page=1&limit=10`

### 5.4 Budgets — `/api/budgets`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/budgets` | Create monthly budget | ✅ |
| GET | `/api/budgets` | List all budgets | ✅ |
| GET | `/api/budgets/:id` | Get budget with live calculations | ✅ |
| PUT | `/api/budgets/:id` | Update monthly limit | ✅ |
| DELETE | `/api/budgets/:id` | Delete budget | ✅ |

**Query Filters:** `?month=2026-04`

### 5.5 Savings Goals — `/api/goals`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/goals` | Create savings goal | ✅ |
| GET | `/api/goals` | List all goals | ✅ |
| GET | `/api/goals/:id` | Get goal details | ✅ |
| PUT | `/api/goals/:id` | Update goal | ✅ |
| DELETE | `/api/goals/:id` | Delete goal | ✅ |
| PUT | `/api/goals/:id/contribute` | Add contribution | ✅ |

**Query Filters:** `?status=active`

### 5.6 Reports & Analytics — `/api/reports`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/reports/monthly-summary` | Income/expense/savings summary | ✅ |
| GET | `/api/reports/category-breakdown` | Expense breakdown by category | ✅ |
| GET | `/api/reports/budget-vs-actual` | Budget limit vs actual spending | ✅ |
| GET | `/api/reports/income-expense-trend` | Multi-month trend data | ✅ |
| GET | `/api/reports/yoy-comparison` | Year-over-year comparison | ✅ |
| GET | `/api/reports/alerts` | Budget overspend alerts | ✅ |

### 5.7 Notifications — `/api/notifications`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/notifications` | List all notifications | ✅ |
| GET | `/api/notifications/unread` | Unread count + breakdown | ✅ |
| PUT | `/api/notifications/read-all` | Mark all as read | ✅ |
| PUT | `/api/notifications/:id/read` | Mark one as read | ✅ |
| DELETE | `/api/notifications/:id` | Delete notification | ✅ |

### 5.8 Utility Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/info` | API metadata |

---

## 6. Middleware Implementation

### 6.1 Authentication Middleware (`auth.middleware.js`)
- Extracts JWT from `Authorization: Bearer <token>` header
- Verifies token using `jsonwebtoken` library
- Attaches decoded user payload to `req.user`
- Returns 401 for missing, expired, or invalid tokens

### 6.2 Authorization Middleware (`authorization.middleware.js`)
- Factory function: `authorize(Model)` — works with any Mongoose model
- Validates ObjectId format, fetches the resource, checks `userId` ownership
- Returns 403 if user does not own the resource
- Attaches resource to `req.resource` to prevent redundant DB queries

### 6.3 Validation Middleware (`validation.middleware.js`)
- Factory function: `validate(schema, source)` — accepts any Joi schema
- Validates `body`, `query`, or `params` as specified
- Strips unknown fields (input sanitization)
- Returns 422 with field-level error details

### 6.4 Error Handler Middleware (`errorHandler.middleware.js`)
- Global catch-all for all errors passed via `next(error)`
- Handles: Mongoose `ValidationError`, `CastError`, duplicate key (11000), JWT errors, `AppError` subclasses, JSON parse errors, payload-too-large
- Environment-aware: verbose stack traces in development, minimal output in production

### 6.5 Logger Middleware (`logger.middleware.js`)
- Logs every request: method, URL, status code, response time, user ID
- ANSI color-coded output (green=2xx, yellow=4xx, red=5xx)
- Logs sanitized request bodies in development (passwords redacted)

### 6.6 Rate Limiter Middleware (`rateLimiter.middleware.js`)
- In-memory rate limiter (no external dependencies)
- Configurable: 100 requests per 15 minutes per IP
- Sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
- Returns 429 when limit exceeded

---

## 7. Authentication & Authorization

### JWT Authentication Flow

```
1. User registers → password hashed with bcrypt (10 salt rounds) → stored in DB
2. User logs in → password compared → JWT generated (7-day expiry)
3. Client includes token: Authorization: Bearer <token>
4. Auth middleware verifies token → attaches req.user = { id: userId }
5. Controllers access req.user.id to scope queries to the authenticated user
```

### Security Features
- Passwords never stored in plaintext (bcrypt hashing)
- `passwordHash` excluded from queries by default (`select: false`)
- JWT tokens are stateless — no server-side session storage
- All resource endpoints verify ownership (`userId` matching)
- Helmet.js adds security headers (XSS, clickjacking, MIME sniffing protection)
- CORS configured for allowed origins and methods
- Rate limiting prevents brute-force attacks

---

## 8. Validation Strategy

All user inputs are validated using **Joi** schemas before processing:

| Module | Create Schema | Update Schema | Extra |
|--------|--------------|---------------|-------|
| Auth | email, password (8+ chars, uppercase, digit), fullName | — | confirmPassword matching |
| Users | — | fullName, currencyPreference, password change | Current password required for password change |
| Transactions | type, amount (positive), category (enum), date (not future), paymentMethod | All optional | Category must match type |
| Budgets | category (expense only), monthlyLimit (positive), month (YYYY-MM) | monthlyLimit only | Duplicate prevention |
| Goals | title, targetAmount (positive), deadline (future date) | title, targetAmount, deadline, status | contributeSchema for contributions |

---

## 9. Error Handling & Response Format

### Consistent Response Structure

**Success Response:**
```json
{
    "success": true,
    "message": "Operation successful",
    "data": { }
}
```

**Error Response:**
```json
{
    "success": false,
    "message": "Validation failed",
    "errorCode": "VALIDATION_ERROR",
    "details": {
        "amount": "Amount must be positive"
    }
}
```

### Typed Error Classes

| Class | HTTP Status | Error Code |
|-------|-------------|------------|
| BadRequestError | 400 | BAD_REQUEST |
| UnauthorizedError | 401 | UNAUTHORIZED |
| ForbiddenError | 403 | FORBIDDEN |
| NotFoundError | 404 | NOT_FOUND |
| ConflictError | 409 | CONFLICT |
| ValidationError | 422 | VALIDATION_ERROR |
| RateLimitError | 429 | RATE_LIMIT_EXCEEDED |

---

## 10. MongoDB Aggregation Pipelines

The Reports module uses MongoDB aggregation pipelines for efficient server-side data computation:

### Monthly Summary Pipeline
```javascript
[
  { $match: { userId: ObjectId, transactionDate: { $gte, $lte } } },
  { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } }
]
```
Produces: totalIncome, totalExpenses, netSavings, savingsRate

### Category Breakdown Pipeline
```javascript
[
  { $match: { userId: ObjectId, type: "expense", transactionDate: { $gte, $lte } } },
  { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  { $sort: { total: -1 } }
]
```
Produces: per-category amount, percentage of total, transaction count

### Income/Expense Trend Pipeline
```javascript
[
  { $match: { userId: ObjectId, transactionDate: { $gte: startDate } } },
  { $group: {
      _id: { year: { $year: "$transactionDate" }, month: { $month: "$transactionDate" }, type: "$type" },
      total: { $sum: "$amount" }
  }},
  { $sort: { "_id.year": 1, "_id.month": 1 } }
]
```
Produces: monthly income/expense data for chart visualization

### Budget Spent Amount Calculation
```javascript
[
  { $match: { userId: ObjectId, type: "expense", category: category, transactionDate: { $gte, $lte } } },
  { $group: { _id: null, totalSpent: { $sum: "$amount" } } }
]
```
Used in real-time budget tracking to calculate `spentAmount` from actual transactions.

---

## 11. Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas cloud)

### Installation Steps

```bash
# 1. Clone the project
cd finance-dashboard-api

# 2. Install dependencies
npm install

# 3. Create .env file
PORT=5000
MONGODB_URI=mongodb://localhost:27017/finance-dashboard
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRY=7d
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# 4. Start development server
npm run dev

# 5. Start production server
npm start
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection string | localhost:27017 |
| JWT_SECRET | Secret key for JWT signing | — |
| JWT_EXPIRY | Token expiration time | 7d |
| NODE_ENV | Environment mode | development |
| CORS_ORIGIN | Allowed frontend origin | localhost:3000 |

---

## 12. Testing Guide

All endpoints were tested using **Postman**. Testing follows this sequence:

1. **Register** a user → receive JWT token
2. **Login** → verify token generation
3. **Create transactions** (income + expenses) → test CRUD
4. **Create budgets** → verify duplicate prevention, spent calculation
5. **Create savings goals** → test contributions, auto-completion
6. **Run reports** → verify aggregation pipeline outputs
7. **Test notifications** → verify CRUD, unread counts
8. **Test error cases** → invalid inputs, unauthorized access, 404s

### Test Categories
- **Happy Path** — Valid inputs, expected behavior
- **Validation Errors** — Missing/invalid fields return 422
- **Authorization** — Users can only access their own resources
- **Edge Cases** — Boundary values, empty results, duplicate prevention
- **Integration** — Transactions automatically update budget spent amounts

---

## 13. Conclusion

The Personal Finance Analytics Dashboard API is a fully functional RESTful backend that demonstrates proficiency in:

- **Express.js** — Route handling, middleware chain, error management
- **MongoDB & Mongoose** — Schema design, indexing, aggregation pipelines
- **Authentication** — JWT-based stateless auth with bcrypt password hashing
- **API Design** — RESTful conventions, consistent response formats, pagination
- **Security** — Helmet, CORS, rate limiting, input validation, password hashing
- **Code Organization** — MVC architecture with clear separation of concerns

The project contains **5 Mongoose models**, **7 controllers**, **7 route files**, **6 middleware**, **5 validators**, and **3 utility modules**, delivering **35+ API endpoints** with comprehensive error handling and data validation.

---

*End of Report*
