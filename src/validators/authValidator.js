const Joi = require("joi");

const registerSchema = Joi.object({
	fullName: Joi.string().min(2).max(50).required().messages({
		"string.empty": "Full name is required",
		"string.min": "Full name must be at least 2 characters",
		"string.max": "Full name cannot exceed 50 characters",
	}),
	email: Joi.string().email().required().messages({
		"string.email": "Please provide a valid email address",
		"string.empty": "Email is required",
	}),
	password: Joi.string()
		.min(8)
		.required()
		.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.messages({
			"string.min": "Password must be at least 8 characters",
			"string.empty": "Password is required",
			"string.pattern.base":
				"Password must contain uppercase, lowercase, and number",
		}),
	confirmPassword: Joi.string()
		.valid(Joi.ref("password"))
		.required()
		.messages({
			"any.only": "Passwords do not match",
		}),
});

const loginSchema = Joi.object({
	email: Joi.string().email().required().messages({
		"string.email": "Please provide a valid email address",
		"string.empty": "Email is required",
	}),
	password: Joi.string().required().messages({
		"string.empty": "Password is required",
	}),
});

const validateRegister = (data) =>
	registerSchema.validate(data, { abortEarly: false });
const validateLogin = (data) =>
	loginSchema.validate(data, { abortEarly: false });

module.exports = {
	validateRegister,
	validateLogin,
};
