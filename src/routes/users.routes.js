const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const {
	getProfile,
	updateProfile,
	deleteAccount,
} = require("../controllers/userController");

const router = express.Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private (Requires JWT token)
 */
router.get("/profile", authenticate, getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private (Requires JWT token)
 */
router.put("/profile", authenticate, updateProfile);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private (Requires JWT token)
 */
router.delete("/account", authenticate, deleteAccount);

module.exports = router;
