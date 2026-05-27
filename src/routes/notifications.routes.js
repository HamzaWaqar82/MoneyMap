const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const {
	getAllNotifications,
	getUnreadCount,
	markAsRead,
	markAllAsRead,
	deleteNotification,
	getVapidPublicKey,
	subscribePush,
	unsubscribePush,
	testPush,
} = require("../controllers/notificationsController");

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications (with optional type filter and pagination)
 * @access  Private (Requires JWT token)
 * @query   type - Filter by type (budget_alert, goal_reminder, transaction_confirmation)
 * @query   page - Page number (default: 1)
 * @query   limit - Results per page (default: 20)
 */
router.get("/", authenticate, getAllNotifications);

/**
 * @route   GET /api/notifications/unread
 * @desc    Get unread notification count with breakdown by type
 * @access  Private (Requires JWT token)
 */
router.get("/unread", authenticate, getUnreadCount);

/**
 * @route   GET /api/notifications/push/vapid-key
 * @desc    Get VAPID public key for Web Push subscription
 * @access  Private
 */
router.get("/push/vapid-key", authenticate, getVapidPublicKey);

/**
 * @route   PUT /api/notifications/push/subscribe
 * @desc    Save browser push subscription
 * @access  Private
 */
router.put("/push/subscribe", authenticate, subscribePush);

/**
 * @route   DELETE /api/notifications/push/subscribe
 * @desc    Remove browser push subscription
 * @access  Private
 */
router.delete("/push/subscribe", authenticate, unsubscribePush);

/**
 * @route   POST /api/notifications/push/test
 * @desc    Send a test push notification to the current user
 * @access  Private
 */
router.post("/push/test", authenticate, testPush);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private (Requires JWT token)
 */
router.put("/read-all", authenticate, markAllAsRead);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a specific notification as read
 * @access  Private (Requires JWT token)
 */
router.put("/:id/read", authenticate, markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private (Requires JWT token)
 */
router.delete("/:id", authenticate, deleteNotification);

module.exports = router;
