const Joi = require("joi");

const createGoalSchema = Joi.object({
	title: Joi.string().trim().min(1).max(200).required().messages({
		"string.empty": "Title is required",
		"string.max": "Title cannot exceed 200 characters",
		"any.required": "Title is required",
	}),
	targetAmount: Joi.number().positive().required().messages({
		"number.positive": "Target amount must be greater than 0",
		"any.required": "Target amount is required",
	}),
	currentAmount: Joi.number().min(0).default(0).messages({
		"number.min": "Current amount cannot be negative",
	}),
	deadline: Joi.date().greater("now").required().messages({
		"date.greater": "Deadline must be a future date",
		"any.required": "Deadline is required",
	}),
});

const updateGoalSchema = Joi.object({
	title: Joi.string().trim().min(1).max(200).optional().messages({
		"string.empty": "Title cannot be empty",
		"string.max": "Title cannot exceed 200 characters",
	}),
	targetAmount: Joi.number().positive().optional().messages({
		"number.positive": "Target amount must be greater than 0",
	}),
	deadline: Joi.date().greater("now").optional().messages({
		"date.greater": "Deadline must be a future date",
	}),
	status: Joi.string()
		.valid("active", "completed", "abandoned")
		.optional()
		.messages({
			"any.only": 'Status must be "active", "completed", or "abandoned"',
		}),
});

const contributeSchema = Joi.object({
	amount: Joi.number().positive().required().messages({
		"number.positive": "Contribution amount must be greater than 0",
		"any.required": "Contribution amount is required",
	}),
});

const validateCreateGoal = (data) =>
	createGoalSchema.validate(data, { abortEarly: false });

const validateUpdateGoal = (data) =>
	updateGoalSchema.validate(data, { abortEarly: false });

const validateContribution = (data) =>
	contributeSchema.validate(data, { abortEarly: false });

module.exports = {
	validateCreateGoal,
	validateUpdateGoal,
	validateContribution,
};
