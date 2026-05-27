const User = require("../models/User");
const { validateUpdateProfile } = require("../validators/userValidator");
const { sendSuccess, sendError } = require("../utils/responseFormatter");
const {
	purgeUserData,
	scheduleAccountDeletion,
	DELETION_GRACE_DAYS,
} = require("../services/accountDeletion.service");

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
				hasPushSubscription: !!user.pushSubscription,
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

// Delete User Account (immediate purge or 30-day scheduled deletion)
const deleteAccount = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { password, deletionMode = "scheduled" } = req.body;

		if (!password) {
			return sendError(
				res,
				"Password is required to delete account",
				"MISSING_PASSWORD",
				400,
			);
		}

		if (!["immediate", "scheduled"].includes(deletionMode)) {
			return sendError(
				res,
				'deletionMode must be "immediate" or "scheduled"',
				"INVALID_DELETION_MODE",
				400,
			);
		}

		const user = await User.findById(userId).select("+passwordHash");

		if (!user) {
			return sendError(res, "User not found", "USER_NOT_FOUND", 404);
		}

		const isPasswordValid = await user.comparePassword(password);

		if (!isPasswordValid) {
			return sendError(
				res,
				"Password is incorrect",
				"INVALID_PASSWORD",
				401,
			);
		}

		if (deletionMode === "immediate") {
			await purgeUserData(userId);
			return sendSuccess(
				res,
				{ mode: "immediate", purged: true },
				"Account and all associated data deleted permanently",
				200,
			);
		}

		const schedule = await scheduleAccountDeletion(user);
		return sendSuccess(
			res,
			{
				mode: "scheduled",
				deletionScheduledFor: schedule.deletionScheduledFor,
				graceDays: DELETION_GRACE_DAYS,
				message: `Account scheduled for deletion. Log in within ${DELETION_GRACE_DAYS} days to cancel.`,
			},
			`Account scheduled for deletion in ${DELETION_GRACE_DAYS} days. Log in before then to keep your account.`,
			200,
		);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getProfile,
	updateProfile,
	deleteAccount,
};
