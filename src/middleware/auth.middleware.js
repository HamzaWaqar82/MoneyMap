const { verifyToken } = require("../utils/tokenGenerator");
const { sendError } = require("../utils/responseFormatter");
const { AppError } = require("../utils/errorHandler");

const authenticate = (req, res, next) => {
	try {
		// Get token from Authorization header
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return sendError(
				res,
				"No authorization token provided",
				"NO_TOKEN",
				401,
			);
		}

		const token = authHeader.substring(7); // Remove "Bearer " prefix

		// Verify token
		const decoded = verifyToken(token);
		req.user = decoded;
		next();
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return sendError(res, "Token expired", "TOKEN_EXPIRED", 401);
		}
		if (error.name === "JsonWebTokenError") {
			return sendError(res, "Invalid token", "INVALID_TOKEN", 401);
		}
		return sendError(res, "Authentication failed", "AUTH_ERROR", 401);
	}
};

module.exports = authenticate;
