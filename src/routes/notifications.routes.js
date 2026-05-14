const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const {
	getAllNotifications,
	getUnreadCount,
	markAsRead,
	markAllAsRead,
	deleteNotification,
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
