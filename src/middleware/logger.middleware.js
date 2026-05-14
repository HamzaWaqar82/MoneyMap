/**
 * Request Logger Middleware
 *
 * Logs every HTTP request with method, URL, status code, response time,
 * and authenticated user ID. Color-coded by status code range for
 * quick visual scanning in the terminal.
 *
 * Log format:
 *   [timestamp] METHOD /path - Status: 200 - Duration: 12ms - User: 6a2f...
 */
const logger = (req, res, next) => {
	const startTime = Date.now();

	// Capture the original res.end function
	const originalEnd = res.end;

	res.end = function (...args) {
		const duration = Date.now() - startTime;
		const userId = req.user?.id || "anonymous";
		const statusCode = res.statusCode;

		// Color code based on status
		let statusColor;
		if (statusCode >= 500) {
			statusColor = "\x1b[31m"; // Red - server error
		} else if (statusCode >= 400) {
			statusColor = "\x1b[33m"; // Yellow - client error
		} else if (statusCode >= 300) {
			statusColor = "\x1b[36m"; // Cyan - redirect
		} else if (statusCode >= 200) {
			statusColor = "\x1b[32m"; // Green - success
		} else {
			statusColor = "\x1b[0m"; // Default
		}
		const reset = "\x1b[0m";

		// Method color
		const methodColors = {
			GET: "\x1b[34m",     // Blue
			POST: "\x1b[32m",    // Green
			PUT: "\x1b[33m",     // Yellow
			DELETE: "\x1b[31m",  // Red
			PATCH: "\x1b[35m",   // Magenta
		};
		const methodColor = methodColors[req.method] || "\x1b[0m";

		console.log(
			`${reset}[${new Date().toISOString()}] ` +
			`${methodColor}${req.method}${reset} ` +
			`${req.originalUrl} - ` +
			`Status: ${statusColor}${statusCode}${reset} - ` +
			`Duration: ${duration}ms - ` +
			`User: ${userId}`,
		);

		// Log request body for POST/PUT in development (exclude passwords)
		if (
			process.env.NODE_ENV !== "production" &&
			(req.method === "POST" || req.method === "PUT") &&
			req.body &&
			Object.keys(req.body).length > 0
		) {
			const sanitizedBody = { ...req.body };
			// Remove sensitive fields from logs
			const sensitiveFields = [
				"password",
				"confirmPassword",
				"currentPassword",
				"newPassword",
				"passwordHash",
			];
			sensitiveFields.forEach((field) => {
				if (sanitizedBody[field]) {
					sanitizedBody[field] = "***REDACTED***";
				}
			});
			console.log(`   📦 Body: ${JSON.stringify(sanitizedBody)}`);
		}

		originalEnd.apply(res, args);
	};

	next();
};

module.exports = logger;
