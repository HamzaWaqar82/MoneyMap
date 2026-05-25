const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
	{
		fullName: {
			type: String,
			required: [true, "Full name is required"],
			trim: true,
			minlength: [2, "Full name must be at least 2 characters"],
			maxlength: [50, "Full name cannot exceed 50 characters"],
		},
		email: {
			type: String,
			required: [true, "Email is required"],
			unique: true,
			lowercase: true,
			match: [
				/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
				"Please provide a valid email",
			],
		},
		passwordHash: {
			type: String,
			required: [true, "Password is required"],
			minlength: [6, "Password must be at least 6 characters"],
			select: false, // Don't return password hash in queries by default
		},
		role: {
			type: String,
			enum: ["user"],
			default: "user",
		},
		currencyPreference: {
			type: String,
			enum: ["PKR", "USD", "EUR", "GBP", "AUD"],
			default: "PKR",
		},
		pushSubscription: {
			type: mongoose.Schema.Types.Mixed,
			default: null,
		}
	},
	{ timestamps: true },
);

// Hash password before saving
userSchema.pre("save", async function () {
	// Only hash if password is modified
	if (!this.isModified("passwordHash")) return;

	const salt = await bcrypt.genSalt(10);
	this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (plainPassword) {
	return await bcrypt.compare(plainPassword, this.passwordHash);
};

// Method to get user data without password
userSchema.methods.toJSON = function () {
	const user = this.toObject();
	delete user.passwordHash;
	return user;
};

module.exports = mongoose.model("User", userSchema);
