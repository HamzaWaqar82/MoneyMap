const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const {
	createGoal,
	getAllGoals,
	getGoal,
	updateGoal,
	deleteGoal,
	contributeToGoal,
} = require("../controllers/goalController");

const router = express.Router();

/**
 * @route   POST /api/goals
 * @desc    Create a new savings goal
 * @access  Private (Requires JWT token)
 */
router.post("/", authenticate, createGoal);

/**
 * @route   GET /api/goals
 * @desc    Get all savings goals (filter with ?status=active|completed|abandoned)
 * @access  Private (Requires JWT token)
 * @query   status - Filter by status (active, completed, abandoned)
 */
router.get("/", authenticate, getAllGoals);

/**
 * @route   GET /api/goals/:id
 * @desc    Get a specific savings goal by ID
 * @access  Private (Requires JWT token)
 */
router.get("/:id", authenticate, getGoal);

/**
 * @route   PUT /api/goals/:id
 * @desc    Update a savings goal (title, targetAmount, deadline, status)
 * @access  Private (Requires JWT token)
 */
router.put("/:id", authenticate, updateGoal);

/**
 * @route   DELETE /api/goals/:id
 * @desc    Delete a savings goal
 * @access  Private (Requires JWT token)
 */
router.delete("/:id", authenticate, deleteGoal);

/**
 * @route   PUT /api/goals/:id/contribute
 * @desc    Add a contribution towards a savings goal
 * @access  Private (Requires JWT token)
 */
router.put("/:id/contribute", authenticate, contributeToGoal);

module.exports = router;
