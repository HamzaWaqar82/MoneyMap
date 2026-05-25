const Joi = require("joi");
const { getSupportedBanks } = require("../services/csvParser.service");

const csvImportSchema = Joi.object({
	bank: Joi.string()
		.optional()
		.allow(null, "")
		.messages({
			"string.base": "Bank must be a string",
		}),
	accountId: Joi.string()
		.pattern(/^[0-9a-fA-F]{24}$/)
		.required()
		.messages({
			"any.required": "Account ID is required — select which account this statement belongs to",
			"string.pattern.base": "Account ID must be a valid MongoDB ObjectId",
		}),
});

const confirmImportSchema = Joi.object({
	transactions: Joi.array()
		.items(
			Joi.object({
				date: Joi.date().required(),
				description: Joi.string().required(),
				amountPaisas: Joi.number().integer().positive().required(),
				type: Joi.string().valid("debit", "credit").required(),
				categoryId: Joi.string()
					.pattern(/^[0-9a-fA-F]{24}$/)
					.allow(null)
					.optional(),
				categoryName: Joi.string().optional(),
				rawRef: Joi.string().allow(null, "").optional(),
				confidence: Joi.number().min(0).max(1).optional(),
			}),
		)
		.min(1)
		.required()
		.messages({
			"array.min": "At least one transaction is required",
			"any.required": "Transactions array is required",
		}),
	accountId: Joi.string()
		.pattern(/^[0-9a-fA-F]{24}$/)
		.required()
		.messages({
			"any.required": "Account ID is required",
			"string.pattern.base": "Account ID must be a valid MongoDB ObjectId",
		}),
});

const reviewTransactionSchema = Joi.object({
	categoryId: Joi.string()
		.pattern(/^[0-9a-fA-F]{24}$/)
		.required()
		.messages({
			"any.required": "Category ID is required",
			"string.pattern.base": "Category ID must be a valid MongoDB ObjectId",
		}),
});

const validateCsvImport = (data) =>
	csvImportSchema.validate(data, { abortEarly: false });

const validateConfirmImport = (data) =>
	confirmImportSchema.validate(data, { abortEarly: false });

const validateReviewTransaction = (data) =>
	reviewTransactionSchema.validate(data, { abortEarly: false });

module.exports = {
	validateCsvImport,
	validateConfirmImport,
	validateReviewTransaction,
};
