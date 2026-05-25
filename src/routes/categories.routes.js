const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const {
	getAllCategories,
	createCategory,
	updateCategory,
	deleteCategory,
} = require("../controllers/categoryController");

const router = express.Router();

/**
 * @route   GET /api/categories
 * @desc    Get all categories (system defaults + user's custom)
 * @access  Private
 * @query   type - Filter by type (income/expense/both)
 */
router.get("/", authenticate, getAllCategories);

/**
 * @route   POST /api/categories
 * @desc    Create a custom category
 * @access  Private
 */
router.post("/", authenticate, createCategory);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update a custom category (system categories are protected)
 * @access  Private
 */
router.put("/:id", authenticate, updateCategory);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a custom category (system categories are protected)
 * @access  Private
 */
router.delete("/:id", authenticate, deleteCategory);

module.exports = router;
