const Joi = require("joi");

const expenseCategories = [
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

const createBudgetSchema = Joi.object({
	category: Joi.string()
		.valid(...expenseCategories)
		.required()
		.messages({
			"any.only": `Category must be one of: ${expenseCategories.join(", ")}`,
			"any.required": "Category is required",
		}),
	monthlyLimit: Joi.number().positive().required().messages({
		"number.positive": "Monthly limit must be greater than 0",
		"any.required": "Monthly limit is required",
	}),
	month: Joi.string()
		.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
		.required()
		.messages({
			"string.pattern.base": "Month must be in YYYY-MM format (e.g., 2026-04)",
			"any.required": "Month is required",
		}),
});

const updateBudgetSchema = Joi.object({
	monthlyLimit: Joi.number().positive().required().messages({
		"number.positive": "Monthly limit must be greater than 0",
		"any.required": "Monthly limit is required",
	}),
});

const validateCreateBudget = (data) =>
	createBudgetSchema.validate(data, { abortEarly: false });

const validateUpdateBudget = (data) =>
	updateBudgetSchema.validate(data, { abortEarly: false });

module.exports = {
	validateCreateBudget,
	validateUpdateBudget,
};
