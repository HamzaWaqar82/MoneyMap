const User = require("../models/User");
const {
	validateRegister,
	validateLogin,
} = require("../validators/authValidator");
const { generateToken } = require("../utils/tokenGenerator");
const { sendSuccess, sendError } = require("../utils/responseFormatter");
const { AppError } = require("../utils/errorHandler");

// Register Controller
const register = async (req, res, next) => {
	try {
		const { fullName, email, password, confirmPassword } = req.body;

		// Validate input
		const { error, value } = validateRegister({
			fullName,
			email,
			password,
			confirmPassword,
		});
		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(
				res,
				"Validation failed",
				"VALIDATION_ERROR",
				422,
				details,
			);
		}

		// Check if user already exists
		const existingUser = await User.findOne({ email: value.email });
		if (existingUser) {
			return sendError(
				res,
				"Email already exists",
				"DUPLICATE_EMAIL",
				409,
				{ email: "Email already registered" },
			);
		}

		// Create new user
		const user = new User({
			fullName: value.fullName,
			email: value.email,
			passwordHash: value.password,
		});

		await user.save();

		// Generate JWT token
		const token = generateToken(user._id);

		// Prepare response (exclude passwordHash)
		const userResponse = {
			id: user._id,
			fullName: user.fullName,
			email: user.email,
			role: user.role,
		};

		sendSuccess(
			res,
			{
				token,
				user: userResponse,
			},
			"User registered successfully",
			201, //   201 new resource created
		);
	} catch (error) {
		next(error);
	} 
};

// Login Controller
const login = async (req, res, next) => {
	try {
		const { email, password } = req.body;

		// Validate input
		const { error, value } = validateLogin({ email, password });
		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(
				res,
				"Validation failed",
				"VALIDATION_ERROR",
				422,
				details,
			);
		}

		// Find user by email and include password hash for comparison
		const user = await User.findOne({ email: value.email }).select(
			"+passwordHash",
		);

		if (!user) {
			return sendError(
				res,
				"Invalid email or password",
				"INVALID_CREDENTIALS",
				401,
			);
		}

		// Compare passwords
		const isPasswordValid = await user.comparePassword(value.password);

		if (!isPasswordValid) {
			return sendError(
				res,
				"Invalid email or password",
				"INVALID_CREDENTIALS",
				401,
			);
		}

		// Generate JWT token
		const token = generateToken(user._id);

		// Prepare response (exclude passwordHash)
		const userResponse = {
			id: user._id,
			fullName: user.fullName,
			email: user.email,
			role: user.role,
			currencyPreference: user.currencyPreference,
		};

		sendSuccess(
			res,
			{
				token,
				user: userResponse,
			},
			"Login successful",
			200,
		);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	register,
	login,
};
