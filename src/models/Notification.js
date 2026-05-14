const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: [true, "User ID is required"],
			index: true,
		},
		type: {
			type: String,
			required: [true, "Notification type is required"],
			enum: {
				values: ["budget_alert", "goal_reminder", "transaction_confirmation"],
				message: "{VALUE} is not a valid notification type",
			},
		},
		message: {
			type: String,
			required: [true, "Message is required"],
			trim: true,
			maxlength: [500, "Message cannot exceed 500 characters"],
		},
		isRead: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true },
);

// Index for querying unread notifications
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
