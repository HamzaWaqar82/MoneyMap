const mongoose = require("mongoose");

const savingsGoalSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: [true, "User ID is required"],
			index: true,
		},
		title: {
			type: String,
			required: [true, "Title is required"],
			trim: true,
			maxlength: [200, "Title cannot exceed 200 characters"],
		},
		targetAmount: {
			type: Number,
			required: [true, "Target amount is required"],
			min: [0.01, "Target amount must be greater than 0"],
		},
		currentAmount: {
			type: Number,
			default: 0,
			min: [0, "Current amount cannot be negative"],
		},
		deadline: {
			type: Date,
			required: [true, "Deadline is required"],
		},
		status: {
			type: String,
			enum: ["active", "completed", "abandoned"],
			default: "active",
		},
		progressPercentage: {
			type: Number,
			default: 0,
			min: 0,
			max: 100,
		},
		reminderFrequency: {
			type: String,
			enum: ["daily", "weekly", "monthly", "none"],
			default: "none",
		},
		lastRemindedAt: {
			type: Date,
			default: null,
		},
	},
	{ timestamps: true },
);

// Index for querying goals by user and status
savingsGoalSchema.index({ userId: 1, status: 1 });
savingsGoalSchema.index({ userId: 1, deadline: 1 });

// Pre-save hook to calculate progressPercentage and auto-complete
savingsGoalSchema.pre("save", function () {
	if (this.targetAmount > 0) {
		this.progressPercentage = Math.min(
			parseFloat(((this.currentAmount / this.targetAmount) * 100).toFixed(2)),
			100,
		);
	}

	// Auto-complete when target is reached
	if (this.currentAmount >= this.targetAmount && this.status === "active") {
		this.status = "completed";
	}
});

module.exports = mongoose.model("SavingsGoal", savingsGoalSchema);
