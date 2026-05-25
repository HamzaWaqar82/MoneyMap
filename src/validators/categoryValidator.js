const Joi = require("joi");

const createCategorySchema = Joi.object({
	name: Joi.string().trim().max(50).required().messages({
		"any.required": "Category name is required",
		"string.max": "Category name cannot exceed 50 characters",
	}),
	icon: Joi.string().trim().max(10).required().messages({
		"any.required": "Icon is required",
		"string.max": "Icon must be a single emoji or short identifier",
	}),
	color: Joi.string()
		.pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
		.required()
		.messages({
			"any.required": "Color is required",
			"string.pattern.base": "Color must be a valid hex color (e.g., #FF5733)",
		}),
	type: Joi.string()
		.valid("income", "expense", "both")
		.required()
		.messages({
			"any.only": 'Category type must be "income", "expense", or "both"',
			"any.required": "Category type is required",
		}),
	keywords: Joi.array()
		.items(Joi.string().max(100))
		.default([])
		.messages({
			"array.includes": "Each keyword must be a string of max 100 characters",
		}),
});

const updateCategorySchema = Joi.object({
	name: Joi.string().trim().max(50).optional().messages({
		"string.max": "Category name cannot exceed 50 characters",
	}),
	icon: Joi.string().trim().max(10).optional().messages({
		"string.max": "Icon must be a single emoji or short identifier",
	}),
	color: Joi.string()
		.pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
		.optional()
		.messages({
			"string.pattern.base": "Color must be a valid hex color (e.g., #FF5733)",
		}),
	type: Joi.string()
		.valid("income", "expense", "both")
		.optional()
		.messages({
			"any.only": 'Category type must be "income", "expense", or "both"',
		}),
	keywords: Joi.array()
		.items(Joi.string().max(100))
		.optional()
		.messages({
			"array.includes": "Each keyword must be a string of max 100 characters",
		}),
});

const validateCreateCategory = (data) =>
	createCategorySchema.validate(data, { abortEarly: false });

const validateUpdateCategory = (data) =>
	updateCategorySchema.validate(data, { abortEarly: false });

module.exports = {
	validateCreateCategory,
	validateUpdateCategory,
};
