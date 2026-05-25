require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/database");
const config = require("./config/env");
const errorHandler = require("./middleware/errorHandler.middleware");
const logger = require("./middleware/logger.middleware");
const rateLimiter = require("./middleware/rateLimiter.middleware");
const { sendError } = require("./utils/responseFormatter");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");
const transactionRoutes = require("./routes/transactions.routes");
const budgetRoutes = require("./routes/budgets.routes");
const goalRoutes = require("./routes/goals.routes");
const reportRoutes = require("./routes/reports.routes");
const notificationRoutes = require("./routes/notifications.routes");

// ── Expense Tracker Module Routes ──
const accountRoutes = require("./routes/accounts.routes");
const categoryRoutes = require("./routes/categories.routes");
const expenseTrackerRoutes = require("./routes/expenseTracker.routes");
const { seedCategories } = require("./seeds/categorySeeder");
const { startNotificationCron } = require("./services/notificationCron.service");

const app = express();

// Initialize MongoDB connection + seed categories
console.log("[APP] About to call connectDB()...");
(async () => {
	await connectDB();
	console.log("[APP] ✅ DB connection established");

	// Seed default categories (idempotent — safe to run on every startup)
	try {
		await seedCategories();
		console.log("[APP] ✅ Categories seeded");
	} catch (seedError) {
		console.error("[APP] ⚠️ Category seeding failed:", seedError.message);
	}

	// Start Cron jobs (skip in test environment)
	if (process.env.NODE_ENV !== "test") {
		startNotificationCron();
		console.log("[APP] ✅ Notification Cron Jobs started");
	}
})().catch(e => console.log("[APP] ❌ DB Promise rejected:", e.message));

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
	cors({
		origin: config.corsOrigin,
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
		allowedHeaders: ["Content-Type", "Authorization"],
	}),
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Request logging middleware
app.use(logger);

// Rate limiting middleware (100 requests per 15 minutes per IP)
app.use(
	rateLimiter({
		windowMs: 15 * 60 * 1000,
		max: process.env.NODE_ENV === 'development' ? 10000 : 100,
		message: "Too many requests from this IP, please try again after 15 minutes",
	}),
);

// ============================================
// API ROUTES
// ============================================

// Health check endpoint
app.get("/health", (req, res) => {
	res.status(200).json({
		status: "OK",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	});
});

// API info endpoint
app.get("/api/info", (req, res) => {
	res.status(200).json({
		name: "Personal Finance Analytics Dashboard API",
		version: "1.0.0",
		description: "REST API for managing personal finances",
	});
});

// Placeholder routes (will be replaced with actual routes)
app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/transactions", transactionRoutes);

app.use("/api/budgets", budgetRoutes);

app.use("/api/goals", goalRoutes);

app.use("/api/reports", reportRoutes);

app.use("/api/notifications", notificationRoutes);

// ── Expense Tracker Module Routes ──
app.use("/api/accounts", accountRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/expense-tracker", expenseTrackerRoutes);

// 404 handler
app.use((req, res) => {
	sendError(res, `Route ${req.originalUrl} not found`, "NOT_FOUND", 404);
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

const PORT = config.port;

// Only bind the port when running directly (not when imported by tests)
if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`
╔═══════════════════════════════════════════════════╗
║   💰 Finance Dashboard API Running 💰            ║
╠═══════════════════════════════════════════════════╣
║ Server: http://localhost:${PORT}                  ║
║ Environment: ${config.nodeEnv}                     ║
║ Database: ${config.mongoUri}               ║
╚═══════════════════════════════════════════════════╝
    `);
	});
}

module.exports = app;
