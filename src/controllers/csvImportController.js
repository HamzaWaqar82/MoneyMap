const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const Category = require("../models/Category");
const { parseCSV, getSupportedBanks } = require("../services/csvParser.service");
const { categorizeAll } = require("../services/categorization.service");
const { rebuildMonthFull } = require("../services/monthlySummary.service");
const {
	validateCsvImport,
	validateConfirmImport,
} = require("../validators/csvImportValidator");
const { sendSuccess, sendError } = require("../utils/responseFormatter");

/**
 * Upload and parse a CSV bank statement
 * POST /api/expense-tracker/import
 *
 * Accepts multipart file upload via multer.
 * Auto-detects bank format, parses transactions, applies auto-categorization,
 * and returns the results for user review before final commit.
 *
 * This is a two-step import flow:
 *   1. Upload → Parse → Categorize → Return for review (this endpoint)
 *   2. User reviews, corrects categories → Confirm (POST /import/confirm)
 */
const uploadCSV = async (req, res, next) => {
	try {
		const userId = req.user.id;

		// Check if file was uploaded
		if (!req.file) {
			return sendError(
				res,
				"No CSV file uploaded. Send as multipart/form-data with field name 'csvFile'",
				"NO_FILE",
				400,
			);
		}

		// Validate form data
		const { error, value } = validateCsvImport({
			bank: req.body.bank || null,
			accountId: req.body.accountId,
		});

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(res, "Validation failed", "VALIDATION_ERROR", 422, details);
		}

		// Verify account exists and belongs to user
		const account = await Account.findOne({
			_id: value.accountId,
			userId,
			isActive: true,
		});

		if (!account) {
			return sendError(
				res,
				"Account not found or inactive",
				"ACCOUNT_NOT_FOUND",
				404,
			);
		}

		// Read the uploaded file content
		const csvString = req.file.buffer.toString("utf-8");

		if (!csvString.trim()) {
			return sendError(
				res,
				"Uploaded CSV file is empty",
				"EMPTY_FILE",
				400,
			);
		}

		// Parse the CSV (auto-detect bank or use specified bank)
		let parseResult;
		try {
			parseResult = await parseCSV(csvString, value.bank || account.provider);
		} catch (parseError) {
			return sendError(
				res,
				parseError.message,
				"PARSE_ERROR",
				400,
			);
		}

		// Get existing transactions for duplicate detection
		const existingTxns = await Transaction.find({
			userId,
			accountId: account._id,
		}).select("transactionDate amountPaisas amount description").lean();

		// Detect duplicates
		const BaseParser = require("../services/parsers/BaseParser");
		const baseParser = new BaseParser();
		const { unique, duplicates } = baseParser.detectDuplicates(
			parseResult.transactions,
			existingTxns,
		);

		// Auto-categorize the unique transactions
		const categorizedTransactions = await categorizeAll(unique);

		// Separate into high-confidence and review-needed
		const autoConfirmed = categorizedTransactions.filter(
			(t) => !t.needsReview,
		);
		const needsReview = categorizedTransactions.filter(
			(t) => t.needsReview,
		);

		sendSuccess(
			res,
			{
				bank: parseResult.bank,
				accountId: account._id,
				accountName: account.name,
				transactions: categorizedTransactions,
				stats: {
					...parseResult.stats,
					uniqueTransactions: unique.length,
					duplicatesSkipped: duplicates.length,
					autoConfirmed: autoConfirmed.length,
					needsReview: needsReview.length,
					totalDebitPKR: parseResult.stats.totalDebitPaisas / 100,
					totalCreditPKR: parseResult.stats.totalCreditPaisas / 100,
				},
				errors: parseResult.errors,
			},
			`Parsed ${unique.length} transactions from ${parseResult.bank} statement. ${needsReview.length} need review.`,
			200,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Confirm and save parsed transactions
 * POST /api/expense-tracker/import/confirm
 *
 * After user reviews and corrects categories from the parse step,
 * this endpoint commits the transactions to the database.
 */
const confirmImport = async (req, res, next) => {
	try {
		const userId = req.user.id;

		const { error, value } = validateConfirmImport(req.body);

		if (error) {
			const details = {};
			error.details.forEach((detail) => {
				details[detail.context.key] = detail.message;
			});
			return sendError(res, "Validation failed", "VALIDATION_ERROR", 422, details);
		}

		// Verify account
		const account = await Account.findOne({
			_id: value.accountId,
			userId,
			isActive: true,
		});

		if (!account) {
			return sendError(
				res,
				"Account not found or inactive",
				"ACCOUNT_NOT_FOUND",
				404,
			);
		}

		const savedTransactions = [];
		const failedTransactions = [];
		const monthsToRebuild = new Set();

		for (const txnData of value.transactions) {
			try {
				// Map debit/credit to expense/income for the existing Transaction model
				const type = txnData.type === "debit" ? "expense" : "income";

				// Find the category name
				let categoryName = txnData.categoryName || "Other";
				if (txnData.categoryId) {
					const cat = await Category.findById(txnData.categoryId).lean();
					if (cat) {
						categoryName = cat.name;
					}
				}

				// Map to existing Transaction model categories if possible
				// This ensures backward compatibility with the existing system
				const mappedCategory = mapToExistingCategory(categoryName, type);

				const transaction = new Transaction({
					userId,
					type,
					amount: txnData.amountPaisas / 100, // Store as PKR for backward compat
					amountPaisas: txnData.amountPaisas,
					category: mappedCategory,
					description: txnData.description,
					transactionDate: new Date(txnData.date),
					paymentMethod: mapPaymentMethod(account.type),
					source: "csv",
					accountId: account._id,
					rawRef: txnData.rawRef || null,
					confidence: txnData.confidence || null,
					needsReview: false, // User has confirmed
				});

				await transaction.save();
				savedTransactions.push(transaction);

				// Track months that need summary rebuilds
				const txnDate = new Date(txnData.date);
				const monthKey = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, "0")}`;
				monthsToRebuild.add(monthKey);
			} catch (txnError) {
				failedTransactions.push({
					data: txnData,
					error: txnError.message,
				});
			}
		}

		// Update account's last import date
		account.lastImportDate = new Date();
		await account.save();

		// Rebuild monthly summaries for affected months
		for (const month of monthsToRebuild) {
			try {
				await rebuildMonthFull(userId, month);
			} catch (rebuildError) {
				console.error(`[CSV_IMPORT] Failed to rebuild summary for ${month}:`, rebuildError.message);
			}
		}

		sendSuccess(
			res,
			{
				saved: savedTransactions.length,
				failed: failedTransactions.length,
				failures: failedTransactions,
				monthsUpdated: Array.from(monthsToRebuild),
			},
			`${savedTransactions.length} transactions imported successfully${failedTransactions.length > 0 ? `, ${failedTransactions.length} failed` : ""}`,
			201,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Get import history for user
 * GET /api/expense-tracker/import/history
 */
const getImportHistory = async (req, res, next) => {
	try {
		const userId = req.user.id;

		// Group CSV-imported transactions by account and import date
		const history = await Transaction.aggregate([
			{
				$match: {
					userId: new mongoose.Types.ObjectId(userId),
					source: "csv",
				},
			},
			{
				$group: {
					_id: {
						accountId: "$accountId",
						date: {
							$dateToString: {
								format: "%Y-%m-%d",
								date: "$createdAt",
							},
						},
					},
					transactionCount: { $sum: 1 },
					totalAmount: { $sum: "$amount" },
					firstDate: { $min: "$transactionDate" },
					lastDate: { $max: "$transactionDate" },
				},
			},
			{
				$sort: { "_id.date": -1 },
			},
			{
				$limit: 20,
			},
		]);

		// Enrich with account names
		const accountIds = [...new Set(history.map((h) => h._id.accountId).filter(Boolean))];
		const accounts = await Account.find({ _id: { $in: accountIds } })
			.select("name provider")
			.lean();

		const accountMap = {};
		accounts.forEach((a) => {
			accountMap[a._id.toString()] = a;
		});

		const enrichedHistory = history.map((item) => ({
			importDate: item._id.date,
			account: accountMap[item._id.accountId?.toString()] || { name: "Unknown", provider: "Unknown" },
			transactionCount: item.transactionCount,
			totalAmountPKR: item.totalAmount,
			dateRange: {
				from: item.firstDate,
				to: item.lastDate,
			},
		}));

		sendSuccess(
			res,
			{ imports: enrichedHistory },
			"Import history retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Get list of supported banks for CSV import
 * GET /api/expense-tracker/supported-banks
 */
const getSupportedBanksList = async (req, res, next) => {
	try {
		sendSuccess(
			res,
			{ banks: getSupportedBanks() },
			"Supported banks retrieved successfully",
			200,
		);
	} catch (error) {
		next(error);
	}
};

// ── Helper Functions ──

/**
 * Map expense tracker category names to existing Transaction model categories.
 * This maintains backward compatibility with the existing system.
 */
const mapToExistingCategory = (categoryName, type) => {
	const incomeCategories = [
		"Salary", "Freelance", "Investment", "Bonus", "Gift", "Other Income",
	];
	const expenseCategories = [
		"Food", "Transport", "Shopping", "Utilities", "Entertainment",
		"Healthcare", "Education", "Rent", "Insurance", "Other Expense",
	];

	// Direct matches
	const existing = [...incomeCategories, ...expenseCategories];
	if (existing.includes(categoryName)) {
		return categoryName;
	}

	// Map new categories to existing ones
	const mapping = {
		"Food & Dining": "Food",
		"Kiryana Store": "Food",
		"Chai & Nashta": "Food",
		"Groceries": "Food",
		"Mobile Topup": "Utilities",
		"Bills & Utilities": "Utilities",
		"Cash Withdrawal": "Other Expense",
		"Transfer": type === "income" ? "Other Income" : "Other Expense",
		"Other": type === "income" ? "Other Income" : "Other Expense",
	};

	return mapping[categoryName] || (type === "income" ? "Other Income" : "Other Expense");
};

/**
 * Map account type to payment method for backward compatibility.
 */
const mapPaymentMethod = (accountType) => {
	const mapping = {
		bank: "bank_transfer",
		wallet: "bank_transfer",
		card: "card",
		cash: "cash",
	};
	return mapping[accountType] || "bank_transfer";
};

module.exports = {
	uploadCSV,
	confirmImport,
	getImportHistory,
	getSupportedBanksList,
};
