# Personal Finance Analytics Dashboard - Backend API

A comprehensive REST API for managing personal finances with expense tracking, budgeting, savings goals, and advanced analytics.

## 📋 Project Overview

This is the backend implementation for the Personal Finance Analytics Dashboard project. It provides a complete REST API with:

- **User Authentication** - JWT-based authentication and authorization
- **Transaction Management** - Create, read, update, and delete financial transactions
- **Budget Tracking** - Set and monitor monthly budgets by category
- **Savings Goals** - Define and track savings targets
- **Financial Analytics** - Advanced reports using MongoDB aggregation pipelines
- **Notifications** - Alert users about budget limits and financial milestones

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **ODM:** Mongoose
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcryptjs
- **Validation:** Joi & express-validator
- **Security:** Helmet.js
- **CORS:** Enabled for frontend integration

## 📦 Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas connection string)
- npm or yarn

### Setup Steps

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd lab-mid-awt
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Configure environment variables**
    - Copy and update `.env` file with your settings:

    ```env
    PORT=5000
    NODE_ENV=development
    MONGODB_URI=mongodb://localhost:27017/finance-dashboard
    JWT_SECRET=your_super_secret_key_here
    JWT_EXPIRY=7d
    CORS_ORIGIN=http://localhost:3000
    ```

4. **Ensure MongoDB is running**

    ```bash
    # If using local MongoDB
    mongod
    ```

5. **Start the server**

    ```bash
    # Development mode (with auto-reload)
    npm run dev

    # Production mode
    npm start
    ```

6. **Verify server is running**
    ```bash
    # Should return 200 OK
    curl http://localhost:5000/health
    ```

## 📁 Project Structure

```
src/
├── config/              # Configuration files
│   ├── database.js     # MongoDB connection
│   └── env.js          # Environment variables
├── models/             # Mongoose schemas (Phase 2+)
├── routes/             # API endpoints (Phase 2+)
├── controllers/        # Business logic (Phase 2+)
├── middleware/         # Custom middleware
│   ├── errorHandler.middleware.js
│   └── logger.middleware.js
├── validators/         # Input validation schemas (Phase 2+)
├── utils/              # Utility functions
│   ├── errorHandler.js
│   └── responseFormatter.js
└── app.js              # Main Express app
```

## 🚀 API Endpoints (Phases 2-8)

### Authentication (`/api/auth`)

- `POST /register` - Register new user
- `POST /login` - User login

### Users (`/api/users`)

- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

### Transactions (`/api/transactions`)

- `POST /` - Create transaction
- `GET /` - Get all transactions (with filters)
- `GET /:id` - Get single transaction
- `PUT /:id` - Update transaction
- `DELETE /:id` - Delete transaction

### Budgets (`/api/budgets`)

- `POST /` - Create budget
- `GET /` - Get all budgets
- `PUT /:id` - Update budget

### Goals (`/api/goals`)

- `POST /` - Create savings goal
- `GET /` - Get all goals
- `PUT /:id` - Update goal

### Reports (`/api/reports`)

- `GET /monthly-summary` - Monthly expense summary
- `GET /category-breakdown` - Category-wise spending
- `GET /budget-vs-actual` - Budget comparison

### Notifications (`/api/notifications`)

- `GET /` - Get all notifications
- `PUT /:id/read` - Mark notification as read

## 📝 Development Phases

- **Phase 1** ✅ - Project setup & dependencies
- **Phase 2** - Authentication Module
- **Phase 3** - User Profile Module
- **Phase 4** - Transactions Module
- **Phase 5** - Budget Module
- **Phase 6** - Savings Goals Module
- **Phase 7** - Reports & Analytics Module
- **Phase 8** - Notifications Module

## 🧪 Testing

Use Postman or similar tool to test API endpoints. Import/create collection with:

- Pre-request scripts for token management
- Test assertions for validation
- Example requests for each endpoint

## 🔐 Security Features

- JWT token-based authentication
- Password hashing with bcryptjs (10 salt rounds)
- Helmet.js for HTTP headers security
- CORS protection
- Input validation and sanitization
- Error handling without exposing sensitive information

## 📊 Response Format

### Success Response

```json
{
	"success": true,
	"message": "Operation successful",
	"data": {}
}
```

### Error Response

```json
{
	"success": false,
	"message": "Validation failed",
	"errorCode": "INVALID_AMOUNT",
	"details": {
		"amount": "Amount must be positive"
	}
}
```

## 🐛 Troubleshooting

### MongoDB Connection Error

- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- Verify connection string format

### Port Already in Use

- Change PORT in .env file
- Or kill existing process: `lsof -ti:5000 | xargs kill -9`

### Module Not Found

- Run `npm install` again
- Delete node_modules and package-lock.json, then reinstall

## 📚 Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **jsonwebtoken** - JWT token generation
- **bcryptjs** - Password hashing
- **joi** - Schema validation
- **express-validator** - Express middleware validation
- **helmet** - HTTP security headers
- **cors** - Cross-Origin Resource Sharing
- **dotenv** - Environment variable management
- **nodemon** - Dev server auto-reload

## 👥 Authors

- Hamza Farooq (FA23-BSE-038)
- Hamza (FA23-BSE-037)

## 📄 License

ISC
