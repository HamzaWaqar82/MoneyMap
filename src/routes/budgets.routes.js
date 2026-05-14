const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const {
	createBudget,
	getAllBudgets,
	getBudget,
	updateBudget,
	deleteBudget,
} = require("../controllers/budgetController");

const router = express.Router();

/**
 * @route   POST /api/budgets
 * @desc    Create a new monthly budget for an expense category
 * @access  Private (Requires JWT token)
 */
router.post("/", authenticate, createBudget);

/**
 * @route   GET /api/budgets
 * @desc    Get all budgets (with optional month filter via ?month=YYYY-MM)
 * @access  Private (Requires JWT token)
 * @query   month - Filter by month (format: YYYY-MM)
 */
router.get("/", authenticate, getAllBudgets);

/**
 * @route   GET /api/budgets/:id
 * @desc    Get a specific budget by ID
 * @access  Private (Requires JWT token)
 */
router.get("/:id", authenticate, getBudget);

/**
 * @route   PUT /api/budgets/:id
 * @desc    Update a budget's monthly limit
 * @access  Private (Requires JWT token)
 */
router.put("/:id", authenticate, updateBudget);

/**
 * @route   DELETE /api/budgets/:id
 * @desc    Delete a budget
 * @access  Private (Requires JWT token)
 */
router.delete("/:id", authenticate, deleteBudget);

module.exports = router;
