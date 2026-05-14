/**
 * Custom Error Classes
 *
 * Typed error classes for consistent error handling across the application.
 * All errors extend AppError and are caught by the global error handler
 * middleware, which maps them to the correct HTTP status and response format.
 *
 * HTTP Status Code Reference:
 *   200 - OK (GET, PUT, DELETE success)
 *   201 - Created (POST success)
 *   400 - Bad Request (invalid data)
 *   401 - Unauthorized (missing/invalid token)
 *   403 - Forbidden (insufficient permissions)
 *   404 - Not Found (resource doesn't exist)
 *   409 - Conflict (duplicate email, duplicate budget)
 *   422 - Validation Error (invalid input)
 *   429 - Too Many Requests (rate limit exceeded)
 *   500 - Internal Server Error (unexpected error)
 */

class AppError extends Error {
	constructor(message, statusCode, errorCode = "INTERNAL_ERROR", details = {}) {
		super(message);
		this.statusCode = statusCode;
		this.errorCode = errorCode;
		this.details = details;
		this.isOperational = true;

		// Capture stack trace, excluding constructor call from it
		Error.captureStackTrace(this, this.constructor);
	}
}

// 400 - Bad Request
class BadRequestError extends AppError {
	constructor(message = "Bad request", details = {}) {
		super(message, 400, "BAD_REQUEST", details);
	}
}

// 401 - Unauthorized
class UnauthorizedError extends AppError {
	constructor(message = "Authentication required", details = {}) {
		super(message, 401, "UNAUTHORIZED", details);
	}
}

// 403 - Forbidden
class ForbiddenError extends AppError {
	constructor(message = "You do not have permission to perform this action", details = {}) {
		super(message, 403, "FORBIDDEN", details);
	}
}

// 404 - Not Found
class NotFoundError extends AppError {
	constructor(resource = "Resource", details = {}) {
		super(`${resource} not found`, 404, "NOT_FOUND", details);
	}
}

// 409 - Conflict
class ConflictError extends AppError {
	constructor(message = "Resource already exists", details = {}) {
		super(message, 409, "CONFLICT", details);
	}
}

// 422 - Validation Error
class ValidationError extends AppError {
	constructor(message = "Validation failed", details = {}) {
		super(message, 422, "VALIDATION_ERROR", details);
	}
}

// 429 - Rate Limit
class RateLimitError extends AppError {
	constructor(message = "Too many requests, please try again later", details = {}) {
		super(message, 429, "RATE_LIMIT_EXCEEDED", details);
	}
}

module.exports = {
	AppError,
	BadRequestError,
	UnauthorizedError,
	ForbiddenError,
	NotFoundError,
	ConflictError,
	ValidationError,
	RateLimitError,
};
