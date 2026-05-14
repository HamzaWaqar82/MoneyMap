const User = require("../models/User");
const { validateUpdateProfile } = require("../validators/userValidator");
const { sendSuccess, sendError } = require("../utils/responseFormatter");

// Get User Profile
const getProfile = async (req, res, next) => {
	try {
		const userId = req.user.id;

		const user = await User.findById(userId);

		if (!user) {
			return sendError(res, "User not found", "USER_NOT_FOUND", 404);
		}

		sendSuccess(
			res,
			{
				id: user._id,
				fullName: user.fullName,
				email: user.email,
				role: user.role,
				currencyPreference: user.currencyPreference,
				createdAt: user.createdAt,
			},
			"Profile retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Update User Profile
const updateProfile = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const {
			fullName,
			currencyPreference,
			currentPassword,
			newPassword,
			confirmPassword,
		} = req.body;

		// Validate input
		const { error } = validateUpdateProfile({
			fullName,
			currencyPreference,
			currentPassword,
			newPassword,
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

		// Find user
		const user = await User.findById(userId).select("+passwordHash");

		if (!user) {
			return sendError(res, "User not found", "USER_NOT_FOUND", 404);
		}

		// If password change is requested
		if (newPassword) {
			// Verify current password
			const isPasswordValid = await user.comparePassword(currentPassword);
			if (!isPasswordValid) {
				return sendError(
					res,
					"Current password is incorrect",
					"INVALID_PASSWORD",
					401,
				);
			}

			// Update password
			user.passwordHash = newPassword;
		}

		// Update other fields
		if (fullName) {
			user.fullName = fullName;
		}
		if (currencyPreference) {
			user.currencyPreference = currencyPreference;
		}

		user.updatedAt = Date.now();
		await user.save();

		sendSuccess(
			res,
			{
				id: user._id,
				fullName: user.fullName,
				email: user.email,
				role: user.role,
				currencyPreference: user.currencyPreference,
				updatedAt: user.updatedAt,
			},
			"Profile updated successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Delete User Account
const deleteAccount = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { password } = req.body;

		// Validate password is provided
		if (!password) {
			return sendError(
				res,
				"Password is required to delete account",
				"MISSING_PASSWORD",
				400,
			);
		}

		// Find user with password
		const user = await User.findById(userId).select("+passwordHash");

		if (!user) {
			return sendError(res, "User not found", "USER_NOT_FOUND", 404);
		}

		// Verify password
		const isPasswordValid = await user.comparePassword(password);

		if (!isPasswordValid) {
			return sendError(
				res,
				"Password is incorrect",
				"INVALID_PASSWORD",
				401,
			);
		}

		// Delete user
		await User.findByIdAndDelete(userId);

		sendSuccess(res, null, "Account deleted successfully", 200);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getProfile,
	updateProfile,
	deleteAccount,
};
