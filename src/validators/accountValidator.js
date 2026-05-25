const Joi = require("joi");

const { ACCOUNT_TYPES, PROVIDERS } = require("../models/Account");

const createAccountSchema = Joi.object({
	name: Joi.string().trim().max(100).required().messages({
		"any.required": "Account name is required",
		"string.max": "Account name cannot exceed 100 characters",
	}),
	type: Joi.string()
		.valid(...ACCOUNT_TYPES)
		.required()
		.messages({
			"any.only": `Account type must be one of: ${ACCOUNT_TYPES.join(", ")}`,
			"any.required": "Account type is required",
		}),
	provider: Joi.string()
		.valid(...PROVIDERS)
		.required()
		.messages({
			"any.only": `Provider must be one of: ${PROVIDERS.join(", ")}`,
			"any.required": "Provider is required",
		}),
	currency: Joi.string()
		.valid("PKR", "USD", "EUR", "GBP", "AED", "SAR")
		.default("PKR")
		.messages({
			"any.only": "Currency must be one of: PKR, USD, EUR, GBP, AED, SAR",
		}),
	maskedAccountNumber: Joi.string()
		.max(8)
		.optional()
		.allow(null, "")
		.messages({
			"string.max": "Masked account number must be at most 8 characters",
		}),
});

const updateAccountSchema = Joi.object({
	name: Joi.string().trim().max(100).optional().messages({
		"string.max": "Account name cannot exceed 100 characters",
	}),
	type: Joi.string()
		.valid(...ACCOUNT_TYPES)
		.optional()
		.messages({
			"any.only": `Account type must be one of: ${ACCOUNT_TYPES.join(", ")}`,
		}),
	provider: Joi.string()
		.valid(...PROVIDERS)
		.optional()
		.messages({
			"any.only": `Provider must be one of: ${PROVIDERS.join(", ")}`,
		}),
	currency: Joi.string()
		.valid("PKR", "USD", "EUR", "GBP", "AED", "SAR")
		.optional()
		.messages({
			"any.only": "Currency must be one of: PKR, USD, EUR, GBP, AED, SAR",
		}),
	maskedAccountNumber: Joi.string()
		.max(8)
		.optional()
		.allow(null, "")
		.messages({
			"string.max": "Masked account number must be at most 8 characters",
		}),
	isActive: Joi.boolean().optional(),
});

const validateCreateAccount = (data) =>
	createAccountSchema.validate(data, { abortEarly: false });

const validateUpdateAccount = (data) =>
	updateAccountSchema.validate(data, { abortEarly: false });

module.exports = {
	validateCreateAccount,
	validateUpdateAccount,
};
