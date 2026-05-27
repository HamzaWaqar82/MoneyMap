const express = require("express");
const multer = require("multer");
const authenticate = require("../middleware/auth.middleware");
const {
	uploadCSV,
	confirmImport,
	getImportHistory,
	getSupportedBanksList,
} = require("../controllers/csvImportController");
const {
	getExpenseSummary,
	getAccountSummary,
	getReviewQueue,
	reviewTransaction,
} = require("../controllers/expenseSummaryController");

const router = express.Router();

// ── Multer configuration for CSV file uploads ──
// Store in memory (not disk) — CSVs are small, no need for temp files.
// Limits: 5MB max, only CSV/text files.
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB max
	},
	fileFilter: (req, file, cb) => {
		const allowedMimes = [
			"text/csv",
			"text/plain",
			"application/vnd.ms-excel",
			"application/csv",
			"text/x-csv",
			"application/x-csv",
		];

		if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith(".csv")) {
			cb(null, true);
		} else {
			cb(new Error("Only CSV files are allowed"), false);
		}
	},
});

// ── CSV Import Routes ──

/**
 * @route   POST /api/expense-tracker/import
 * @desc    Upload and parse a CSV bank statement (step 1 of 2-step import)
 * @access  Private
 * @body    csvFile (multipart file), accountId (string), bank (string, optional)
 */
router.post("/import", authenticate, upload.single("csvFile"), uploadCSV);

/**
 * @route   POST /api/expense-tracker/import/confirm
 * @desc    Confirm and save parsed transactions (step 2 of 2-step import)
 * @access  Private
 */
router.post("/import/confirm", authenticate, confirmImport);

/**
 * @route   GET /api/expense-tracker/import/history
 * @desc    Get CSV import history
 * @access  Private
 */
router.get("/import/history", authenticate, getImportHistory);

/**
 * @route   GET /api/expense-tracker/supported-banks
 * @desc    Get list of supported banks for CSV import
 * @access  Private
 */
router.get("/supported-banks", authenticate, getSupportedBanksList);

// ── Summary & Analytics Routes ──

/**
 * @route   GET /api/expense-tracker/summary
 * @desc    Get monthly expense summary (materialized view)
 * @access  Private
 * @query   month - Month in YYYY-MM format
 */
router.get("/summary", authenticate, getExpenseSummary);

/**
 * @route   GET /api/expense-tracker/summary/:accountId
 * @desc    Get per-account spending summary
 * @access  Private
 * @query   month - Month in YYYY-MM format
 */
router.get("/summary/:accountId", authenticate, getAccountSummary);

// ── Review Queue Routes ──

/**
 * @route   GET /api/expense-tracker/review-queue
 * @desc    Get transactions needing category review
 * @access  Private
 * @query   page, limit
 */
router.get("/review-queue", authenticate, getReviewQueue);

/**
 * @route   PUT /api/expense-tracker/review/:transactionId
 * @desc    Confirm or correct a transaction's auto-assigned category
 * @access  Private
 */
router.put("/review/:transactionId", authenticate, reviewTransaction);

module.exports = router;
