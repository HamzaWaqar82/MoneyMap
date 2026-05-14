const mongoose = require("mongoose");
const { sendError } = require("../utils/responseFormatter");

/**
 * Authorization Middleware — Resource Ownership
 *
 * Verifies that the authenticated user owns the resource they're trying
 * to access. Works with any Mongoose model that has a `userId` field.
 *
 * Usage in routes:
 *   router.put("/:id", authenticate, authorize(Transaction), updateTransaction);
 *   router.delete("/:id", authenticate, authorize(Budget), deleteBudget);
 *
 * @param {mongoose.Model} Model - The Mongoose model to check ownership against
 * @returns {Function} Express middleware function
 */
const authorize = (Model) => {
	return async (req, res, next) => {
		try {
			const userId = req.user.id;
			const resourceId = req.params.id;

			// Validate ObjectId format
			if (!mongoose.Types.ObjectId.isValid(resourceId)) {
				return sendError(
					res,
					"Invalid resource ID format",
					"INVALID_ID",
					400,
				);
			}

			// Find the resource
			const resource = await Model.findById(resourceId);

			if (!resource) {
				return sendError(
					res,
					"Resource not found",
					"RESOURCE_NOT_FOUND",
					404,
				);
			}

			// Check ownership
			if (resource.userId.toString() !== userId) {
				return sendError(
					res,
					"You are not authorized to access this resource",
					"FORBIDDEN",
					403,
				);
			}

			// Attach resource to request for downstream use (avoids re-fetching)
			req.resource = resource;
			next();
		} catch (error) {
			next(error);
		}
	};
};

module.exports = authorize;
