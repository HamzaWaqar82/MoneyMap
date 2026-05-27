const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const {
	createAccount,
	getAllAccounts,
	getAccount,
	updateAccount,
	deleteAccount,
} = require("../controllers/accountController");

const router = express.Router();

/**
 * @route   POST /api/accounts
 * @desc    Create a new account (bank/wallet/card/cash)
 * @access  Private
 */
router.post("/", authenticate, createAccount);

/**
 * @route   GET /api/accounts
 * @desc    Get all accounts for the authenticated user
 * @access  Private
 * @query   active - Filter by active status (true/false)
 */
router.get("/", authenticate, getAllAccounts);

/**
 * @route   GET /api/accounts/:id
 * @desc    Get a single account by ID
 * @access  Private
 */
router.get("/:id", authenticate, getAccount);

/**
 * @route   PUT /api/accounts/:id
 * @desc    Update an account
 * @access  Private
 */
router.put("/:id", authenticate, updateAccount);

/**
 * @route   DELETE /api/accounts/:id
 * @desc    Soft-delete an account (preserves transaction history)
 * @access  Private
 */
router.delete("/:id", authenticate, deleteAccount);

module.exports = router;
