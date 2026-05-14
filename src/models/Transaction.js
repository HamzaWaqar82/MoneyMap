const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: [true, "User ID is required"],
			index: true,
		},
		type: {
			type: String,
			enum: ["income", "expense"],
			required: [true, "Transaction type is required"],
		},
		amount: {
			type: Number,
			required: [true, "Amount is required"],
			min: [0.01, "Amount must be greater than 0"],
		},
		category: {
			type: String,
			required: [true, "Category is required"],
			enum: {
				values: [
					// Income categories
					"Salary",
					"Freelance",
					"Investment",
					"Bonus",
					"Gift",
					"Other Income",
					// Expense categories
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
				],
				message: "{VALUE} is not a valid category",
			},
		},
		description: {
			type: String,
			trim: true,
			maxlength: [500, "Description cannot exceed 500 characters"],
		},
		transactionDate: {
			type: Date,
			required: [true, "Transaction date is required"],
			default: Date.now,
		},
		paymentMethod: {
			type: String,
			enum: ["cash", "card", "bank_transfer"],
			default: "cash",
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
		updatedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true },
);

// Index for better query performance
transactionSchema.index({ userId: 1, transactionDate: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
