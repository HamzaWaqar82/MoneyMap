const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, "Category name is required"],
			trim: true,
			maxlength: [50, "Category name cannot exceed 50 characters"],
		},
		icon: {
			type: String,
			required: [true, "Icon is required"],
			trim: true,
			maxlength: [10, "Icon must be a single emoji or short identifier"],
		},
		color: {
			type: String,
			required: [true, "Color is required"],
			match: [
				/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
				"Color must be a valid hex color (e.g., #FF5733)",
			],
		},
		type: {
			type: String,
			enum: {
				values: ["income", "expense", "both"],
				message: "{VALUE} is not a valid category type",
			},
			required: [true, "Category type is required"],
		},
		isSystem: {
			type: Boolean,
			default: false,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null, // null for system categories
		},
		keywords: {
			type: [String],
			default: [],
			validate: {
				validator: function (v) {
					return v.every((kw) => typeof kw === "string" && kw.length <= 100);
				},
				message: "Each keyword must be a string of max 100 characters",
			},
		},
	},
	{ timestamps: true },
);

// Compound index: system categories are globally unique by name,
// user categories are unique per user
categorySchema.index(
	{ name: 1, userId: 1 },
	{ unique: true, partialFilterExpression: { userId: { $ne: null } } },
);

// Index for fast lookup by type
categorySchema.index({ type: 1, isSystem: 1 });

// Index for keyword-based auto-categorization search
categorySchema.index({ keywords: 1 });

// Prevent deletion of system categories
categorySchema.pre("deleteOne", { document: true, query: false }, function (next) {
	if (this.isSystem) {
		const error = new Error("System categories cannot be deleted");
		error.statusCode = 403;
		return next(error);
	}
	next();
});

module.exports = mongoose.model("Category", categorySchema);
