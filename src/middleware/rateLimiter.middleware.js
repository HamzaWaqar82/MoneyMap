const { sendError } = require("../utils/responseFormatter");

/**
 * Rate Limiter Middleware
 *
 * Simple in-memory rate limiter to prevent API abuse.
 * Tracks requests per IP within a configurable time window.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 min)
 * @param {number} options.max - Max requests per window per IP (default: 100)
 * @param {string} options.message - Error message when limit exceeded
 * @returns {Function} Express middleware function
 */
const rateLimiter = (options = {}) => {
	const {
		windowMs = 15 * 60 * 1000, // 15 minutes
		max = process.env.NODE_ENV === 'development' ? 10000 : 100,
		message = "Too many requests, please try again later",
	} = options;

	const requests = new Map();

	// Cleanup expired entries periodically
	setInterval(() => {
		const now = Date.now();
		for (const [key, data] of requests.entries()) {
			if (now - data.startTime > windowMs) {
				requests.delete(key);
			}
		}
	}, windowMs);

	return (req, res, next) => {
		const ip = req.ip || req.connection.remoteAddress;
		const now = Date.now();

		// 🔍 DEBUG: Track rate limit state
		const currentData = requests.get(ip);
		console.log(`[RATE] IP: ${ip} | Count: ${currentData?.count || 0}/${max} | Path: ${req.originalUrl}`);

		if (!requests.has(ip)) {
			requests.set(ip, { count: 1, startTime: now });
			return next();
		}

		const clientData = requests.get(ip);

		// Reset window if expired
		if (now - clientData.startTime > windowMs) {
			requests.set(ip, { count: 1, startTime: now });
			return next();
		}

		clientData.count++;

		// Set rate limit headers
		res.set("X-RateLimit-Limit", max);
		res.set("X-RateLimit-Remaining", Math.max(0, max - clientData.count));
		res.set(
			"X-RateLimit-Reset",
			new Date(clientData.startTime + windowMs).toISOString(),
		);

		if (clientData.count > max) {
			return sendError(res, message, "RATE_LIMIT_EXCEEDED", 429);
		}

		next();
	};
};

module.exports = rateLimiter;
