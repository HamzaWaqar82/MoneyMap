const Category = require("../models/Category");
const {
	validateCreateCategory,
	validateUpdateCategory,
} = require("../validators/categoryValidator");
const { sendSuccess, sendError } = require("../utils/responseFormatter");
const { invalidateCategoryCache } = require("../services/categorization.service");

/**
 * Get all categories (system + user's custom)
 * GET /api/categories
 * Query: ?type=expense (filter by type)
 */
const getAllCategories = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { type } = req.query;

		// System categories (userId = null) + user's custom categories
		const filter = {
			$or: [
				{ isSystem: true },
				{ userId },
			],
		};

		if (type && ["income", "expense", "both"].includes(type)) {
			filter.$or = filter.$or.map((clause) => ({
				...clause,
				$or: [{ type }, { type: "both" }],
			}));

			// Simplify: get all then filter in JS (cleaner for this case)
			const all = await Category.find({
				$or: [{ isSystem: true }, { userId }],
			}).sort({ isSystem: -1, name: 1 });

			const filtered = all.filter(
				(cat) => cat.type === type || cat.type === "both",
			);

			return sendSuccess(
				res,
				{
					categories: filtered,
					total: filtered.length,
					systemCount: filtered.filter((c) => c.isSystem).length,
					customCount: filtered.filter((c) => !c.isSystem).length,
				},
				"Categories retrieved successfully",
				200,
			);
		}

		const categories = await Category.find({
			$or: [{ isSystem: true }, { userId }],
		}).sort({ isSystem: -1, name: 1 });

		sendSuccess(
			res,
			{
				categories,
				total: categories.length,
				systemCount: categories.filter((c) => c.isSystem).length,
				customCount: categories.filter((c) => !c.isSystem).length,
			},
			"Categories retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Create a custom category
 * POST /api/categories
 */
const createCategory = async (req, res, next) => {
	try {
		const userId = req.user.id;

		const { error, value } = validateCreateCategory(req.body);

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(res, "Validation failed", "VALIDATION_ERROR", 422, details);
		}

		// Check for duplicate name (across system and user categories)
		const existingSystem = await Category.findOne({
			name: value.name,
			isSystem: true,
		});

		if (existingSystem) {
			return sendError(
				res,
				`A system category named "${value.name}" already exists`,
				"DUPLICATE_CATEGORY",
				409,
			);
		}

		const existingUser = await Category.findOne({
			name: value.name,
			userId,
		});

		if (existingUser) {
			return sendError(
				res,
				`You already have a custom category named "${value.name}"`,
				"DUPLICATE_CATEGORY",
				409,
			);
		}

		const category = new Category({
			...value,
			isSystem: false,
			userId,
		});

		await category.save();

		// Invalidate categorization cache so new keywords are picked up
		invalidateCategoryCache();

		sendSuccess(res, category, "Category created successfully", 201);
	} catch (error) {
		next(error);
	}
};

/**
 * Update a custom category
 * PUT /api/categories/:id
 *
 * System categories cannot be modified by users.
 */
const updateCategory = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const { error, value } = validateUpdateCategory(req.body);

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(res, "Validation failed", "VALIDATION_ERROR", 422, details);
		}

		const category = await Category.findById(id);

		if (!category) {
			return sendError(res, "Category not found", "CATEGORY_NOT_FOUND", 404);
		}

		if (category.isSystem) {
			return sendError(
				res,
				"System categories cannot be modified",
				"SYSTEM_CATEGORY_PROTECTED",
				403,
			);
		}

		if (category.userId && category.userId.toString() !== userId) {
			return sendError(
				res,
				"You can only edit your own categories",
				"FORBIDDEN",
				403,
			);
		}

		// Update fields
		Object.keys(value).forEach((key) => {
			if (value[key] !== undefined) {
				category[key] = value[key];
			}
		});

		await category.save();

		invalidateCategoryCache();

		sendSuccess(res, category, "Category updated successfully", 200);
	} catch (error) {
		next(error);
	}
};

/**
 * Delete a custom category
 * DELETE /api/categories/:id
 *
 * System categories cannot be deleted.
 */
const deleteCategory = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const category = await Category.findById(id);

		if (!category) {
			return sendError(res, "Category not found", "CATEGORY_NOT_FOUND", 404);
		}

		if (category.isSystem) {
			return sendError(
				res,
				"System categories cannot be deleted",
				"SYSTEM_CATEGORY_PROTECTED",
				403,
			);
		}

		if (category.userId && category.userId.toString() !== userId) {
			return sendError(
				res,
				"You can only delete your own categories",
				"FORBIDDEN",
				403,
			);
		}

		await Category.deleteOne({ _id: id });

		invalidateCategoryCache();

		sendSuccess(res, null, "Category deleted successfully", 200);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getAllCategories,
	createCategory,
	updateCategory,
	deleteCategory,
};
