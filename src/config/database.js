const mongoose = require("mongoose");
const {mongoUri} = require("./env");

const connectDB = async () => {
	console.log("[DB] connectDB() called at:", new Date().toISOString());
	console.log("[DB] Attempting to connect to:", mongoUri?.substring(0, 30) + "...");
	try {
		console.log("[DB] mongoose.connect() starting...");
		const conn = await mongoose.connect(mongoUri);
		console.log("[DB] ✅ Connected! Host:", conn.connection.host);
		return mongoose.connection;
	} catch (error) {
		console.error("[DB] ❌ Connection FAILED");
		console.error("[DB] Error name:", error.name);
		console.error("[DB] Error code:", error.code);
		console.error("[DB] Error message:", error.message);
		console.error("[DB] Full error:", JSON.stringify(error, null, 2));
		process.exit(1);
	}
};

module.exports = connectDB;
