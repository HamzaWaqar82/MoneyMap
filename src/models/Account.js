const mongoose = require("mongoose");

const ACCOUNT_TYPES = ["bank", "wallet", "card", "cash"];
const PROVIDERS = [
	"HBL",
	"UBL",
	"Meezan",
	"MCB",
	"Allied Bank",
	"Askari Bank",
	"Bank Alfalah",
	"Faysal Bank",
	"Standard Chartered",
	"JazzCash",
	"Easypaisa",
	"SadaPay",
	"NayaPay",
	"Cash",
	"Other",
];

const accountSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: [true, "User ID is required"],
			index: true,
		},
		name: {
			type: String,
			required: [true, "Account name is required"],
			trim: true,
			maxlength: [100, "Account name cannot exceed 100 characters"],
		},
		type: {
			type: String,
			required: [true, "Account type is required"],
			enum: {
				values: ACCOUNT_TYPES,
				message: `{VALUE} is not a valid account type. Must be one of: ${ACCOUNT_TYPES.join(", ")}`,
			},
		},
		provider: {
			type: String,
			required: [true, "Provider is required"],
			enum: {
				values: PROVIDERS,
				message: `{VALUE} is not a valid provider`,
			},
		},
		currency: {
			type: String,
			default: "PKR",
			enum: {
				values: ["PKR", "USD", "EUR", "GBP", "AED", "SAR"],
				message: "{VALUE} is not a supported currency",
			},
		},
		lastImportDate: {
			type: Date,
			default: null,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		// Masked account identifier (last 4 digits) — never store full account numbers
		maskedAccountNumber: {
			type: String,
			default: null,
			maxlength: [8, "Masked account number must be at most 8 characters"],
		},
	},
	{ timestamps: true },
);

// A user cannot have duplicate accounts for same provider with same name
accountSchema.index({ userId: 1, provider: 1, name: 1 }, { unique: true });

// For listing user's active accounts
accountSchema.index({ userId: 1, isActive: 1 });

// Soft-delete: don't actually remove, just deactivate
accountSchema.methods.softDelete = function () {
	this.isActive = false;
	return this.save();
};

module.exports = mongoose.model("Account", accountSchema);
module.exports.ACCOUNT_TYPES = ACCOUNT_TYPES;
module.exports.PROVIDERS = PROVIDERS;
