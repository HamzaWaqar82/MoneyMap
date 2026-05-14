const jwt = require("jsonwebtoken");
const config = require("../config/env");

const generateToken = (userId) => {
	try {
		const token = jwt.sign({ id: userId }, config.jwtSecret, {
			expiresIn: config.jwtExpiry,
		});
		return token;
	} catch (error) {
		throw new Error("Token generation failed");
	}
};

const verifyToken = (token) => {
	try {
		const decoded = jwt.verify(token, config.jwtSecret);
		return decoded;
	} catch (error) {
		throw error;
	}
};

const decodeToken = (token) => {
	try {
		const decoded = jwt.decode(token);
		return decoded;
	} catch (error) {
		return null;
	}
};

module.exports = {
	generateToken,
	verifyToken,
	decodeToken,
};
