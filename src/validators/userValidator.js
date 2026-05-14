const Joi = require("joi");

const updateProfileSchema = Joi.object({
	fullName: Joi.string().min(2).max(50).optional().messages({
		"string.min": "Full name must be at least 2 characters",
		"string.max": "Full name cannot exceed 50 characters",
	}),
	currencyPreference: Joi.string()
		.valid("PKR", "USD", "EUR", "GBP", "AUD")
		.optional()
		.messages({
			"any.only": "Invalid currency preference",
		}),
	currentPassword: Joi.string().when("newPassword", {
		is: Joi.exist(),
		then: Joi.required(),
		otherwise: Joi.forbidden(),
	}),
	newPassword: Joi.string()
		.min(8)
		.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.optional()
		.messages({
			"string.min": "Password must be at least 8 characters",
			"string.pattern.base":
				"Password must contain uppercase, lowercase, and number",
		}),
	confirmPassword: Joi.string()
		.valid(Joi.ref("newPassword"))
		.when("newPassword", {
			is: Joi.exist(),
			then: Joi.required(),
			otherwise: Joi.forbidden(),
		})
		.messages({
			"any.only": "Passwords do not match",
		}),
});

const validateUpdateProfile = (data) =>
	updateProfileSchema.validate(data, { abortEarly: false });

module.exports = {
	validateUpdateProfile,
};
