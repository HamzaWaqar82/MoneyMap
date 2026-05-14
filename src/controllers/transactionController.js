const Transaction = require("../models/Transaction");
const {
	validateCreateTransaction,
	validateUpdateTransaction,
} = require("../validators/transactionValidator");
const { sendSuccess, sendError } = require("../utils/responseFormatter");

// Create Transaction
const createTransaction = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const {
			type,
			amount,
			category,
			description,
			transactionDate,
			paymentMethod,
		} = req.body;

		// Validate input
		const { error, value } = validateCreateTransaction({
			type,
			amount,
			category,
			description,
			transactionDate,
			paymentMethod,
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

		// Create transaction
		const transaction = new Transaction({
			userId,
			type: value.type,
			amount: value.amount,
			category: value.category,
			description: value.description,
			transactionDate: value.transactionDate,
			paymentMethod: value.paymentMethod,
		});

		await transaction.save();

		sendSuccess(
			res,
			{
				id: transaction._id,
				userId: transaction.userId,
				type: transaction.type,
				amount: transaction.amount,
				category: transaction.category,
				description: transaction.description,
				transactionDate: transaction.transactionDate,
				paymentMethod: transaction.paymentMethod,
				createdAt: transaction.createdAt,
			},
			"Transaction created successfully",
			201,
		);
	} catch (error) {
		next(error);
	}
};

// Get All Transactions (with filtering and pagination)
const getAllTransactions = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const {
			category,
			type,
			startDate,
			endDate,
			page = 1,
			limit = 10,
		} = req.query;

		// Build filter object
		const filter = { userId };

		if (category) {
			filter.category = category;
		}

		if (type) {
			if (!["income", "expense"].includes(type)) {
				return sendError(
					res,
					'Invalid type. Must be "income" or "expense"',
					"INVALID_TYPE",
					400,
				);
			}
			filter.type = type;
		}

		if (startDate || endDate) {
			filter.transactionDate = {};
			if (startDate) {
				const start = new Date(startDate);
				if (isNaN(start.getTime())) {
					return sendError(
						res,
						"Invalid startDate format",
						"INVALID_DATE",
						400,
					);
				}
				filter.transactionDate.$gte = start;
			}
			if (endDate) {
				const end = new Date(endDate);
				if (isNaN(end.getTime())) {
					return sendError(
						res,
						"Invalid endDate format",
						"INVALID_DATE",
						400,
					);
				}
				// Set end date to end of day
				end.setHours(23, 59, 59, 999);
				filter.transactionDate.$lte = end;
			}
		}

		// Pagination
		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);

		if (pageNum < 1 || limitNum < 1) {
			return sendError(
				res,
				"Page and limit must be greater than 0",
				"INVALID_PAGINATION",
				400,
			);
		}

		const skip = (pageNum - 1) * limitNum;

		// Get total count for pagination
		const total = await Transaction.countDocuments(filter);
		const totalPages = Math.ceil(total / limitNum);

		// Fetch transactions
		const transactions = await Transaction.find(filter)
			.sort({ transactionDate: -1 })
			.skip(skip)
			.limit(limitNum);

		sendSuccess(
			res,
			{
				transactions,
				pagination: {
					page: pageNum,
					limit: limitNum,
					total,
					totalPages,
				},
			},
			"Transactions retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Get Single Transaction
const getTransaction = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const transaction = await Transaction.findOne({
			_id: id,
			userId,
		});

		if (!transaction) {
			return sendError(
				res,
				"Transaction not found",
				"TRANSACTION_NOT_FOUND",
				404,
			);
		}

		sendSuccess(
			res,
			transaction,
			"Transaction retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// Update Transaction
const updateTransaction = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;
		const {
			type,
			amount,
			category,
			description,
			transactionDate,
			paymentMethod,
		} = req.body;

		// Validate input
		const { error } = validateUpdateTransaction({
			type,
			amount,
			category,
			description,
			transactionDate,
			paymentMethod,
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

		// Find transaction
		const transaction = await Transaction.findOne({
			_id: id,
			userId,
		});

		if (!transaction) {
			return sendError(
				res,
				"Transaction not found",
				"TRANSACTION_NOT_FOUND",
				404,
			);
		}

		// Update fields
		if (type !== undefined) transaction.type = type;
		if (amount !== undefined) transaction.amount = amount;
		if (category !== undefined) transaction.category = category;
		if (description !== undefined) transaction.description = description;
		if (transactionDate !== undefined)
			transaction.transactionDate = transactionDate;
		if (paymentMethod !== undefined)
			transaction.paymentMethod = paymentMethod;

		transaction.updatedAt = Date.now();
		await transaction.save();

		sendSuccess(res, transaction, "Transaction updated successfully", 200);
	} catch (error) {
		next(error);
	}
};

// Delete Transaction
const deleteTransaction = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { id } = req.params;

		const transaction = await Transaction.findOneAndDelete({
			_id: id,
			userId,
		});

		if (!transaction) {
			return sendError(
				res,
				"Transaction not found",
				"TRANSACTION_NOT_FOUND",
				404,
			);
		}

		sendSuccess(res, null, "Transaction deleted successfully", 200);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	createTransaction,
	getAllTransactions,
	getTransaction,
	updateTransaction,
	deleteTransaction,
};
