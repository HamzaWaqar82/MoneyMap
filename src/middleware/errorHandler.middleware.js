const { sendError } = require("../utils/responseFormatter");
const { AppError } = require("../utils/errorHandler");

/**
 * Global Error Handler Middleware
 *
 * Catches all errors thrown/passed via next(error) and sends
 * a consistent JSON error response. Handles:
 * - Mongoose ValidationError (422)
 * - Mongoose CastError / invalid ObjectId (400)
 * - Mongoose duplicate key error (409)
 * - JWT errors (401)
 * - Custom AppError (dynamic status)
 * - Unexpected errors (500)
 */
const errorHandler = (err, req, res, next) => {
	// Log error details in development
	if (process.env.NODE_ENV !== "production") {
		console.error(
			`\n❌ [ERROR] ${new Date().toISOString()}`,
			`\n   Route: ${req.method} ${req.originalUrl}`,
			`\n   Name: ${err.name}`,
			`\n   Message: ${err.message}`,
			err.stack ? `\n   Stack: ${err.stack.split("\n").slice(0, 3).join("\n")}` : "",
		);
	} else {
		console.error("Error:", err.message);
	}

	// Mongoose validation error
	if (err.name === "ValidationError") {
		const details = Object.values(err.errors).reduce((acc, error) => {
			acc[error.path] = error.message;
			return acc;
		}, {});
		return sendError(
			res,
			"Validation failed",
			"VALIDATION_ERROR",
			422,
			details,
		);
	}

	// Mongoose CastError (invalid ObjectId, invalid types)
	if (err.name === "CastError") {
		return sendError(
			res,
			`Invalid ${err.path}: ${err.value}`,
			"INVALID_ID",
			400,
			{ [err.path]: `Invalid value for ${err.path}` },
		);
	}

	// Mongoose duplicate key error
	if (err.code === 11000) {
		const field = Object.keys(err.keyValue)[0];
		return sendError(
			res,
			`${field} already exists`,
			"DUPLICATE_KEY_ERROR",
			409,
			{ [field]: `${field} already exists` },
		);
	}

	// JWT errors
	if (err.name === "JsonWebTokenError") {
		return sendError(res, "Invalid token", "INVALID_TOKEN", 401);
	}

	if (err.name === "TokenExpiredError") {
		return sendError(res, "Token expired", "TOKEN_EXPIRED", 401);
	}

	// Custom AppError (and subclasses: BadRequestError, NotFoundError, etc.)
	if (err instanceof AppError) {
		return sendError(res, err.message, err.errorCode, err.statusCode, err.details || {});
	}

	// Syntax errors (malformed JSON body)
	if (err.type === "entity.parse.failed") {
		return sendError(
			res,
			"Invalid JSON in request body",
			"PARSE_ERROR",
			400,
		);
	}

	// Payload too large
	if (err.type === "entity.too.large") {
		return sendError(
			res,
			"Request body is too large",
			"PAYLOAD_TOO_LARGE",
			413,
		);
	}

	// Default error
	sendError(
		res,
		process.env.NODE_ENV === "production"
			? "Something went wrong"
			: err.message || "Something went wrong",
		"INTERNAL_ERROR",
		500,
	);
};

module.exports = errorHandler;
