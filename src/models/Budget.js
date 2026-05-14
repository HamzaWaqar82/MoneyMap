const mongoose = require("mongoose");

const expenseCategories = [
	"Food",
	"Transport",
	"Shopping",
	"Utilities",
	"Entertainment",
	"Healthcare",
	"Education",
	"Rent",
	"Insurance",
	"Other Expense",
];

const budgetSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: [true, "User ID is required"],
			index: true,
		},
		category: {
			type: String,
			required: [true, "Category is required"],
			enum: {
				values: expenseCategories,
				message: "{VALUE} is not a valid expense category",
			},
		},
		monthlyLimit: {
			type: Number,
			required: [true, "Monthly limit is required"],
			min: [0.01, "Monthly limit must be greater than 0"],
		},
		spentAmount: {
			type: Number,
			default: 0,
			min: [0, "Spent amount cannot be negative"],
		},
		remainingAmount: {
			type: Number,
			default: 0,
		},
		month: {
			type: String,
			required: [true, "Month is required (format: YYYY-MM)"],
			match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"],
		},
	},
	{ timestamps: true },
);

// Compound unique index: prevent duplicate budgets for same user + category + month
budgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });

// Index for querying budgets by user and month
budgetSchema.index({ userId: 1, month: 1 });

// Pre-save hook to calculate remainingAmount
budgetSchema.pre("save", function () {
	this.remainingAmount = this.monthlyLimit - this.spentAmount;
});

module.exports = mongoose.model("Budget", budgetSchema);
module.exports.expenseCategories = expenseCategories;
