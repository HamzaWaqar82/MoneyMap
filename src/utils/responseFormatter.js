/**
 * Response Formatter Utility
 *
 * Ensures every API response follows a consistent JSON structure:
 *
 * Success:
 *   {
 *     "success": true,
 *     "message": "Operation successful",
 *     "data": { ... }
 *   }
 *
 * Error:
 *   {
 *     "success": false,
 *     "message": "Validation failed",
 *     "errorCode": "VALIDATION_ERROR",
 *     "details": { "field": "error message" }
 *   }
 *
 * Paginated:
 *   {
 *     "success": true,
 *     "message": "...",
 *     "data": { ... },
 *     "pagination": { page, limit, total, totalPages }
 *   }
 */

/**
 * Send a successful response
 * @param {Response} res - Express response object
 * @param {*} data - Response data payload
 * @param {string} message - Human-readable success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (
	res,
	data,
	message = "Operation successful",
	statusCode = 200,
) => {
	res.status(statusCode).json({
		success: true,
		message,
		data,
	});
};

/**
 * Send an error response
 * @param {Response} res - Express response object
 * @param {string} message - Human-readable error message
 * @param {string} errorCode - Machine-readable error code (e.g., "VALIDATION_ERROR")
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Object} details - Field-level error details
 */
const sendError = (
	res,
	message,
	errorCode = "INTERNAL_ERROR",
	statusCode = 500,
	details = {},
) => {
	res.status(statusCode).json({
		success: false,
		message,
		errorCode,
		details,
	});
};

/**
 * Send a paginated success response
 * @param {Response} res - Express response object
 * @param {*} data - Response data payload
 * @param {Object} pagination - Pagination metadata { page, limit, total, totalPages }
 * @param {string} message - Human-readable success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendPaginated = (
	res,
	data,
	pagination,
	message = "Data retrieved successfully",
	statusCode = 200,
) => {
	res.status(statusCode).json({
		success: true,
		message,
		data,
		pagination: {
			page: pagination.page,
			limit: pagination.limit,
			total: pagination.total,
			totalPages: pagination.totalPages,
			hasNextPage: pagination.page < pagination.totalPages,
			hasPreviousPage: pagination.page > 1,
		},
	});
};

/**
 * HTTP Status Code reference for the application:
 *
 * 200 - OK: GET, PUT, DELETE success
 * 201 - Created: POST success (new resource created)
 * 400 - Bad Request: Invalid data format, missing required fields
 * 401 - Unauthorized: Missing or invalid JWT token
 * 403 - Forbidden: Valid token but insufficient permissions
 * 404 - Not Found: Resource does not exist
 * 409 - Conflict: Duplicate resource (email, budget for same month/category)
 * 422 - Validation Error: Data validation failed (Joi schema errors)
 * 429 - Too Many Requests: Rate limit exceeded
 * 500 - Internal Server Error: Unexpected server-side failure
 */

module.exports = {
	sendSuccess,
	sendError,
	sendPaginated,
};
