require("dotenv").config();

console.log("[ENV] MONGODB_URI loaded:", process.env.MONGODB_URI ? "✅ (length: " + process.env.MONGODB_URI.length + ")" : "❌ UNDEFINED");
console.log("[ENV] MONGODB_URI value:", process.env.MONGODB_URI?.substring(0, 20) + "...");

module.exports = {
	port: process.env.PORT || 5000,
	nodeEnv: process.env.NODE_ENV || "development",
	mongoUri: process.env.MONGODB_URI,
	jwtSecret: process.env.JWT_SECRET || "your_secret_key",
	jwtExpiry: process.env.JWT_EXPIRY || "7d",
	corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
};
