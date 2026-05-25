const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendSuccess, sendError } = require("../utils/responseFormatter");
const { vapidPublicKey } = require("../services/pushNotification.service");

// Get All Notifications (with optional type filter and pagination)
const getAllNotifications = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { type, page = 1, limit = 20 } = req.query;

		// Build filter
		const filter = { userId };

		if (type) {
			if (
				!["budget_alert", "goal_reminder", "transaction_confirmation"].includes(
					type,
				)
			) {
				return sendError(
					res,
					'Invalid type. Must be "budget_alert", "goal_reminder", or "transaction_confirmation"',
					"INVALID_TYPE",
					400,
				);
			}
			filter.type = type;
		}

		// Pagination
		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);

		if (pageNum < 1 || limitNum < 1) {
			return sendError(
				res,
				"Page and limit must be greater than 0",
				"INVALID_PAGINATION",
				400,
			);
		}

		const skip = (pageNum - 1) * limitNum;
		const total = await Notification.countDocuments(filter);
		const totalPages = Math.ceil(total / limitNum);

		const notifications = await Notification.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limitNum);

		sendSuccess(
			res,
			{
				notifications,
				pagination: {
					page: pageNum,
					limit: limitNum,
					total,
					totalPages,
				},
			},
			"Notifications retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Get Unread Notification Count
const getUnreadCount = async (req, res, next) => {
	try {
		const userId = req.user.id;

		const unreadCount = await Notification.countDocuments({
			userId,
			isRead: false,
		});

		// Also get breakdown by type
		const breakdown = await Notification.aggregate([
			{
				$match: {
					userId: require("mongoose").Types.ObjectId.createFromHexString(userId),
					isRead: false,
				},
			},
			{
				$group: {
					_id: "$type",
					count: { $sum: 1 },
				},
			},
		]);

		const byType = {};
		breakdown.forEach((item) => {
			byType[item._id] = item.count;
		});

		sendSuccess(
			res,
			{
				unreadCount,
				byType,
			},
			"Unread count retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Mark Notification as Read
const markAsRead = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const notification = await Notification.findOne({ _id: id, userId });

		if (!notification) {
			return sendError(
				res,
				"Notification not found",
				"NOTIFICATION_NOT_FOUND",
				404,
			);
		}

		notification.isRead = true;
		await notification.save();

		sendSuccess(
			res,
			{
				id: notification._id,
				type: notification.type,
				message: notification.message,
				isRead: notification.isRead,
				createdAt: notification.createdAt,
			},
			"Notification marked as read",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Mark All Notifications as Read
const markAllAsRead = async (req, res, next) => {
	try {
		const userId = req.user.id;

		const result = await Notification.updateMany(
			{ userId, isRead: false },
			{ isRead: true },
		);

		sendSuccess(
			res,
			{ modifiedCount: result.modifiedCount },
			`${result.modifiedCount} notification(s) marked as read`,
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Delete Notification
const deleteNotification = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const notification = await Notification.findOneAndDelete({
			_id: id,
			userId,
		});

		if (!notification) {
			return sendError(
				res,
				"Notification not found",
				"NOTIFICATION_NOT_FOUND",
				404,
			);
		}

		sendSuccess(res, null, "Notification deleted successfully", 200);
	} catch (error) {
		next(error);
	}
};

// Create Notification (utility - used internally by other controllers)
const createNotification = async (userId, type, message) => {
	try {
		const notification = new Notification({
			userId,
			type,
			message,
		});
		await notification.save();
		return notification;
	} catch (error) {
		console.error("Failed to create notification:", error.message);
		return null;
	}
};

// Get VAPID public key for browser push subscription
const getVapidPublicKey = async (req, res, next) => {
	try {
		sendSuccess(res, { publicKey: vapidPublicKey }, "VAPID public key retrieved", 200);
	} catch (error) {
		next(error);
	}
};

// Save browser push subscription for current user
const subscribePush = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { subscription } = req.body;

		if (!subscription || !subscription.endpoint) {
			return sendError(res, "Valid push subscription is required", "INVALID_SUBSCRIPTION", 400);
		}

		const user = await User.findById(userId);
		if (!user) {
			return sendError(res, "User not found", "USER_NOT_FOUND", 404);
		}

		user.pushSubscription = subscription;
		await user.save();

		sendSuccess(res, { subscribed: true }, "Push notifications enabled", 200);
	} catch (error) {
		next(error);
	}
};

// Remove browser push subscription
const unsubscribePush = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const user = await User.findById(userId);
		if (!user) {
			return sendError(res, "User not found", "USER_NOT_FOUND", 404);
		}

		user.pushSubscription = null;
		await user.save();

		sendSuccess(res, { subscribed: false }, "Push notifications disabled", 200);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getAllNotifications,
	getUnreadCount,
	markAsRead,
	markAllAsRead,
	deleteNotification,
	createNotification,
	getVapidPublicKey,
	subscribePush,
	unsubscribePush,
};
