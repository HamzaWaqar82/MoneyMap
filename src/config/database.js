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
		// Don't kill the process in test/dev — let the caller handle it
		if (process.env.NODE_ENV === "production") {
			process.exit(1);
		}
		throw error;
	}
};

module.exports = connectDB;
