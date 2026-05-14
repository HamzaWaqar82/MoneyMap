const Joi = require("joi");

const validCategories = [
	"Salary",
	"Freelance",
	"Investment",
	"Bonus",
	"Gift",
	"Other Income",
	"Food",
	"Transport",
	"Shopping",
	"Utilities",
	"Entertainment",
	"Healthcare",
	"Education",
	"Rent",
	"Insurance",
	"Other Expense",
];

const createTransactionSchema = Joi.object({
	type: Joi.string().valid("income", "expense").required().messages({
		"any.only": 'Type must be either "income" or "expense"',
		"any.required": "Type is required",
	}),
	amount: Joi.number().positive().required().messages({
		"number.positive": "Amount must be greater than 0",
		"any.required": "Amount is required",
	}),
	category: Joi.string()
		.valid(...validCategories)
		.required()
		.messages({
			"any.only": `Category must be one of: ${validCategories.join(", ")}`,
			"any.required": "Category is required",
		}),
	description: Joi.string().max(500).optional().messages({
		"string.max": "Description cannot exceed 500 characters",
	}),
	transactionDate: Joi.date().max("now").required().messages({
		"date.max": "Transaction date cannot be in the future",
		"any.required": "Transaction date is required",
	}),
	paymentMethod: Joi.string()
		.valid("cash", "card", "bank_transfer")
		.default("cash")
		.messages({
			"any.only":
				'Payment method must be "cash", "card", or "bank_transfer"',
		}),
});

const updateTransactionSchema = Joi.object({
	type: Joi.string().valid("income", "expense").optional().messages({
		"any.only": 'Type must be either "income" or "expense"',
	}),
	amount: Joi.number().positive().optional().messages({
		"number.positive": "Amount must be greater than 0",
	}),
	category: Joi.string()
		.valid(...validCategories)
		.optional()
		.messages({
			"any.only": `Category must be one of: ${validCategories.join(", ")}`,
		}),
	description: Joi.string().max(500).optional().messages({
		"string.max": "Description cannot exceed 500 characters",
	}),
	transactionDate: Joi.date().max("now").optional().messages({
		"date.max": "Transaction date cannot be in the future",
	}),
	paymentMethod: Joi.string()
		.valid("cash", "card", "bank_transfer")
		.optional()
		.messages({
			"any.only":
				'Payment method must be "cash", "card", or "bank_transfer"',
		}),
});

const validateCreateTransaction = (data) =>
	createTransactionSchema.validate(data, { abortEarly: false });

const validateUpdateTransaction = (data) =>
	updateTransactionSchema.validate(data, { abortEarly: false });

module.exports = {
	validateCreateTransaction,
	validateUpdateTransaction,
};
