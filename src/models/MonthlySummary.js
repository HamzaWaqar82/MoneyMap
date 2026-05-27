const mongoose = require("mongoose");

/**
 * MonthlySummary — Materialized read-optimized projection.
 *
 * Rebuilt on each transaction insert/update/delete.
 * Avoids expensive GROUP BY on every dashboard load.
 * This is a classic "read-optimized projection" pattern for fintech dashboards.
 */
const monthlySummarySchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: [true, "User ID is required"],
		},
		month: {
			type: String,
			required: [true, "Month is required (format: YYYY-MM)"],
			match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"],
		},
		categoryId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Category",
			required: [true, "Category ID is required"],
		},
		categoryName: {
			type: String,
			required: true,
		},
		type: {
			type: String,
			enum: ["income", "expense"],
			required: true,
		},
		totalAmountPaisas: {
			type: Number,
			default: 0,
			min: [0, "Total amount cannot be negative"],
		},
		transactionCount: {
			type: Number,
			default: 0,
			min: [0, "Transaction count cannot be negative"],
		},
		lastUpdated: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true },
);

// One summary per user + month + category — the core unique constraint
monthlySummarySchema.index(
	{ userId: 1, month: 1, categoryId: 1 },
	{ unique: true },
);

// For fast dashboard queries: all summaries for a user in a month
monthlySummarySchema.index({ userId: 1, month: 1, type: 1 });

/**
 * Convert paisas to PKR for display.
 * ₨850.50 is stored as 85050 paisas internally.
 */
monthlySummarySchema.methods.getAmountPKR = function () {
	return this.totalAmountPaisas / 100;
};

module.exports = mongoose.model("MonthlySummary", monthlySummarySchema);
