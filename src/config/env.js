require("dotenv").config();

module.exports = {
	port: process.env.PORT || 5000,
	nodeEnv: process.env.NODE_ENV || "development",
	mongoUri: process.env.MONGODB_URI,
	jwtSecret: process.env.JWT_SECRET || "your_secret_key",
	jwtExpiry: process.env.JWT_EXPIRY || "7d",
	corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
};
