const SavingsGoal = require("../models/SavingsGoal");
const {
	validateCreateGoal,
	validateUpdateGoal,
	validateContribution,
} = require("../validators/goalValidator");
const { sendSuccess, sendError } = require("../utils/responseFormatter");

// Create Savings Goal
const createGoal = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { title, targetAmount, currentAmount, deadline } = req.body;

		// Validate input
		const { error, value } = validateCreateGoal({
			title,
			targetAmount,
			currentAmount,
			deadline,
		});

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(
				res,
				"Validation failed",
				"VALIDATION_ERROR",
				422,
				details,
			);
		}

		// Ensure currentAmount does not exceed targetAmount
		if (value.currentAmount > value.targetAmount) {
			return sendError(
				res,
				"Current amount cannot exceed target amount",
				"INVALID_AMOUNT",
				400,
				{ currentAmount: "Current amount cannot exceed target amount" },
			);
		}

		// Create goal
		const goal = new SavingsGoal({
			userId,
			title: value.title,
			targetAmount: value.targetAmount,
			currentAmount: value.currentAmount,
			deadline: value.deadline,
		});

		await goal.save();

		sendSuccess(
			res,
			{
				id: goal._id,
				userId: goal.userId,
				title: goal.title,
				targetAmount: goal.targetAmount,
				currentAmount: goal.currentAmount,
				deadline: goal.deadline,
				status: goal.status,
				progressPercentage: goal.progressPercentage,
				createdAt: goal.createdAt,
			},
			"Savings goal created successfully",
			201,
		);
	} catch (error) {
		next(error);
	}
};

// Get All Savings Goals
const getAllGoals = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { status } = req.query;

		// Build filter
		const filter = { userId };

		if (status) {
			if (!["active", "completed", "abandoned"].includes(status)) {
				return sendError(
					res,
					'Invalid status. Must be "active", "completed", or "abandoned"',
					"INVALID_STATUS",
					400,
				);
			}
			filter.status = status;
		}

		const goals = await SavingsGoal.find(filter).sort({ deadline: 1 });

		const goalsData = goals.map((goal) => ({
			id: goal._id,
			userId: goal.userId,
			title: goal.title,
			targetAmount: goal.targetAmount,
			currentAmount: goal.currentAmount,
			deadline: goal.deadline,
			status: goal.status,
			progressPercentage: goal.progressPercentage,
			daysRemaining: Math.max(
				0,
				Math.ceil(
					(new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24),
				),
			),
			createdAt: goal.createdAt,
			updatedAt: goal.updatedAt,
		}));

		sendSuccess(
			res,
			{ goals: goalsData },
			"Savings goals retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Get Single Savings Goal
const getGoal = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const goal = await SavingsGoal.findOne({ _id: id, userId });

		if (!goal) {
			return sendError(res, "Savings goal not found", "GOAL_NOT_FOUND", 404);
		}

		sendSuccess(
			res,
			{
				id: goal._id,
				userId: goal.userId,
				title: goal.title,
				targetAmount: goal.targetAmount,
				currentAmount: goal.currentAmount,
				deadline: goal.deadline,
				status: goal.status,
				progressPercentage: goal.progressPercentage,
				daysRemaining: Math.max(
					0,
					Math.ceil(
						(new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24),
					),
				),
				createdAt: goal.createdAt,
				updatedAt: goal.updatedAt,
			},
			"Savings goal retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Update Savings Goal
const updateGoal = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;
		const { title, targetAmount, deadline, status } = req.body;

		// Validate input
		const { error } = validateUpdateGoal({
			title,
			targetAmount,
			deadline,
			status,
		});

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(
				res,
				"Validation failed",
				"VALIDATION_ERROR",
				422,
				details,
			);
		}

		// Find goal
		const goal = await SavingsGoal.findOne({ _id: id, userId });

		if (!goal) {
			return sendError(res, "Savings goal not found", "GOAL_NOT_FOUND", 404);
		}

		// Update fields
		if (title !== undefined) goal.title = title;
		if (targetAmount !== undefined) {
			// Ensure currentAmount does not exceed new targetAmount
			if (goal.currentAmount > targetAmount) {
				return sendError(
					res,
					"Target amount cannot be less than current amount",
					"INVALID_TARGET",
					400,
					{
						targetAmount: `Target amount must be at least ${goal.currentAmount}`,
					},
				);
			}
			goal.targetAmount = targetAmount;
		}
		if (deadline !== undefined) goal.deadline = deadline;
		if (status !== undefined) goal.status = status;

		await goal.save();

		sendSuccess(
			res,
			{
				id: goal._id,
				userId: goal.userId,
				title: goal.title,
				targetAmount: goal.targetAmount,
				currentAmount: goal.currentAmount,
				deadline: goal.deadline,
				status: goal.status,
				progressPercentage: goal.progressPercentage,
				updatedAt: goal.updatedAt,
			},
			"Savings goal updated successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Delete Savings Goal
const deleteGoal = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const goal = await SavingsGoal.findOneAndDelete({ _id: id, userId });

		if (!goal) {
			return sendError(res, "Savings goal not found", "GOAL_NOT_FOUND", 404);
		}

		sendSuccess(res, null, "Savings goal deleted successfully", 200);
	} catch (error) {
		next(error);
	}
};

// Contribute to Savings Goal
const contributeToGoal = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;
		const { amount } = req.body;

		// Validate input
		const { error, value } = validateContribution({ amount });

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(
				res,
				"Validation failed",
				"VALIDATION_ERROR",
				422,
				details,
			);
		}

		// Find goal
		const goal = await SavingsGoal.findOne({ _id: id, userId });

		if (!goal) {
			return sendError(res, "Savings goal not found", "GOAL_NOT_FOUND", 404);
		}

		// Cannot contribute to completed or abandoned goals
		if (goal.status !== "active") {
			return sendError(
				res,
				`Cannot contribute to a ${goal.status} goal`,
				"GOAL_NOT_ACTIVE",
				400,
			);
		}

		// Check if contribution would exceed target
		const newAmount = goal.currentAmount + value.amount;
		if (newAmount > goal.targetAmount) {
			const maxContribution = goal.targetAmount - goal.currentAmount;
			return sendError(
				res,
				`Contribution would exceed target. Maximum contribution allowed: ${maxContribution}`,
				"EXCEEDS_TARGET",
				400,
				{
					amount: `Maximum contribution allowed is ${maxContribution}`,
					currentAmount: goal.currentAmount,
					targetAmount: goal.targetAmount,
				},
			);
		}

		// Update current amount
		goal.currentAmount = newAmount;
		await goal.save();

		sendSuccess(
			res,
			{
				id: goal._id,
				userId: goal.userId,
				title: goal.title,
				targetAmount: goal.targetAmount,
				currentAmount: goal.currentAmount,
				contributedAmount: value.amount,
				deadline: goal.deadline,
				status: goal.status,
				progressPercentage: goal.progressPercentage,
				remainingAmount: goal.targetAmount - goal.currentAmount,
				updatedAt: goal.updatedAt,
			},
			goal.status === "completed"
				? "Congratulations! Savings goal completed!"
				: "Contribution added successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	createGoal,
	getAllGoals,
	getGoal,
	updateGoal,
	deleteGoal,
	contributeToGoal,
};
