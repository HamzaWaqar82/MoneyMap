const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const {
	createTransaction,
	getAllTransactions,
	getTransaction,
	updateTransaction,
	deleteTransaction,
} = require("../controllers/transactionController");

const router = express.Router();

/**
 * @route   POST /api/transactions
 * @desc    Create a new transaction
 * @access  Private (Requires JWT token)
 */
router.post("/", authenticate, createTransaction);

/**
 * @route   GET /api/transactions
 * @desc    Get all transactions (with filtering and pagination)
 * @access  Private (Requires JWT token)
 * @query   category - Filter by category
 * @query   type - Filter by type (income or expense)
 * @query   startDate - Filter transactions from this date
 * @query   endDate - Filter transactions until this date
 * @query   page - Page number (default: 1)
 * @query   limit - Results per page (default: 10)
 */
router.get("/", authenticate, getAllTransactions);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get a specific transaction by ID
 * @access  Private (Requires JWT token)
 */
router.get("/:id", authenticate, getTransaction);

/**
 * @route   PUT /api/transactions/:id
 * @desc    Update a transaction
 * @access  Private (Requires JWT token)
 */
router.put("/:id", authenticate, updateTransaction);

/**
 * @route   DELETE /api/transactions/:id
 * @desc    Delete a transaction
 * @access  Private (Requires JWT token)
 */
router.delete("/:id", authenticate, deleteTransaction);

module.exports = router;
