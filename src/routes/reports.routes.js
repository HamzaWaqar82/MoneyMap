const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const {
	getMonthlySummary,
	getCategoryBreakdown,
	getBudgetVsActual,
	getIncomeExpenseTrend,
	getYoyComparison,
	getBudgetAlerts,
} = require("../controllers/reportsController");

const router = express.Router();

/**
 * @route   GET /api/reports/monthly-summary
 * @desc    Get monthly income/expense summary with savings rate
 * @access  Private (Requires JWT token)
 * @query   month - Month in YYYY-MM format (required)
 */
router.get("/monthly-summary", authenticate, getMonthlySummary);

/**
 * @route   GET /api/reports/category-breakdown
 * @desc    Get expense breakdown by category with percentages
 * @access  Private (Requires JWT token)
 * @query   month - Month in YYYY-MM format (required)
 */
router.get("/category-breakdown", authenticate, getCategoryBreakdown);

/**
 * @route   GET /api/reports/budget-vs-actual
 * @desc    Compare budgeted amounts vs actual spending per category
 * @access  Private (Requires JWT token)
 * @query   month - Month in YYYY-MM format (required)
 */
router.get("/budget-vs-actual", authenticate, getBudgetVsActual);

/**
 * @route   GET /api/reports/income-expense-trend
 * @desc    Get income vs expense trend for the last N months
 * @access  Private (Requires JWT token)
 * @query   months - Number of months to look back (default: 6, max: 24)
 */
router.get("/income-expense-trend", authenticate, getIncomeExpenseTrend);

/**
 * @route   GET /api/reports/yoy-comparison
 * @desc    Year-over-year spending comparison by category
 * @access  Private (Requires JWT token)
 * @query   year - Current year (required)
 * @query   previousYear - Previous year to compare (required)
 */
router.get("/yoy-comparison", authenticate, getYoyComparison);

/**
 * @route   GET /api/reports/alerts
 * @desc    Get budget alerts for categories nearing or exceeding limits (>80%)
 * @access  Private (Requires JWT token)
 * @query   month - Month in YYYY-MM format (defaults to current month)
 */
router.get("/alerts", authenticate, getBudgetAlerts);

module.exports = router;
