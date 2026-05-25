const { verifyToken } = require("../utils/tokenGenerator");
const { sendError } = require("../utils/responseFormatter");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return sendError(
				res,
				"No authorization token provided",
				"NO_TOKEN",
				401,
			);
		}

		const token = authHeader.substring(7);
		const decoded = verifyToken(token);

		const user = await User.findById(decoded.id);
		if (!user) {
			return sendError(res, "User not found", "USER_NOT_FOUND", 401);
		}

		if (user.pendingDeletion) {
			return sendError(
				res,
				"Account is scheduled for deletion. Log in again to cancel and restore your account.",
				"ACCOUNT_PENDING_DELETION",
				403,
			);
		}

		req.user = { id: user._id.toString(), email: user.email, role: user.role };
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
