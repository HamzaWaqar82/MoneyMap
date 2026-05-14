const { sendError } = require("../utils/responseFormatter");

/**
 * Validation Middleware Factory
 *
 * Creates Express middleware that validates the request body (or query/params)
 * against a Joi schema. Returns 422 with detailed error messages on failure.
 *
 * Usage in routes:
 *   const { createTransactionSchema } = require("../validators/transactionValidator");
 *   router.post("/", authenticate, validate(createTransactionSchema), createTransaction);
 *
 *   // Validate query params:
 *   router.get("/", authenticate, validate(querySchema, "query"), getAllItems);
 *
 * @param {Joi.Schema} schema - A Joi validation schema
 * @param {string} source - The request property to validate: "body", "query", or "params"
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = "body") => {
	return (req, res, next) => {
		const dataToValidate = req[source];

		const { error, value } = schema.validate(dataToValidate, {
			abortEarly: false,
			stripUnknown: true,
		});

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				const key = detail.context?.key || detail.path.join(".");
				details[key] = detail.message;
			});

			return sendError(
				res,
				"Validation failed",
				"VALIDATION_ERROR",
				422,
				details,
			);
		}

		// Replace with validated (and sanitized) values
		req[source] = value;
		next();
	};
};

module.exports = validate;
