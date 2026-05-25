const mongoose = require("mongoose");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const SavingsGoal = require("../models/SavingsGoal");
const Notification = require("../models/Notification");
const Account = require("../models/Account");
const Category = require("../models/Category");
const MonthlySummary = require("../models/MonthlySummary");

const DELETION_GRACE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Permanently delete a user and all associated data.
 */
const purgeUserData = async (userId) => {
	const userObjId = new mongoose.Types.ObjectId(userId);

	await Promise.all([
		Transaction.deleteMany({ userId: userObjId }),
		Budget.deleteMany({ userId: userObjId }),
		SavingsGoal.deleteMany({ userId: userObjId }),
		Notification.deleteMany({ userId: userObjId }),
		Account.deleteMany({ userId: userObjId }),
		MonthlySummary.deleteMany({ userId: userObjId }),
		Category.deleteMany({ userId: userObjId, isSystem: false }),
	]);

	await User.findByIdAndDelete(userId);
};

/**
 * Schedule account deletion in 30 days (soft-delete flag on user only; data retained).
 */
const scheduleAccountDeletion = async (user) => {
	const now = new Date();
	user.pendingDeletion = true;
	user.deletionRequestedAt = now;
	user.deletionScheduledFor = new Date(now.getTime() + DELETION_GRACE_DAYS * MS_PER_DAY);
	user.pushSubscription = null;
	await user.save();

	return {
		mode: "scheduled",
		deletionScheduledFor: user.deletionScheduledFor,
		graceDays: DELETION_GRACE_DAYS,
	};
};

/**
 * Cancel a pending scheduled deletion (restore account to normal).
 */
const cancelScheduledDeletion = async (user) => {
	user.pendingDeletion = false;
	user.deletionRequestedAt = null;
	user.deletionScheduledFor = null;
	await user.save();
};

/**
 * Restore account if user logs in within the grace period.
 * @returns {boolean} true if deletion was cancelled
 */
const restoreAccountIfPending = async (user) => {
	if (!user.pendingDeletion) return false;

	const now = new Date();
	if (user.deletionScheduledFor && user.deletionScheduledFor <= now) {
		await purgeUserData(user._id);
		return false;
	}

	await cancelScheduledDeletion(user);
	return true;
};

/**
 * Process all users whose scheduled deletion date has passed.
 * @returns {number} count of users purged
 */
const processExpiredScheduledDeletions = async () => {
	const expiredUsers = await User.find({
		pendingDeletion: true,
		deletionScheduledFor: { $lte: new Date() },
	}).select("_id email");

	for (const user of expiredUsers) {
		await purgeUserData(user._id);
		console.log(`[CRON] Purged scheduled deletion for user ${user._id}`);
	}

	return expiredUsers.length;
};

module.exports = {
	DELETION_GRACE_DAYS,
	purgeUserData,
	scheduleAccountDeletion,
	cancelScheduledDeletion,
	restoreAccountIfPending,
	processExpiredScheduledDeletions,
};
