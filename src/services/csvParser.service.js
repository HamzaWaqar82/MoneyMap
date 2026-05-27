const { parse } = require("csv-parse/sync");
const HBLParser = require("./parsers/HBLParser");
const JazzCashParser = require("./parsers/JazzCashParser");

/**
 * CSV Parser Service — Factory & Router
 *
 * This is the entry point for CSV ingestion. It:
 *   1. Auto-detects the bank format from CSV headers
 *   2. Delegates parsing to the correct bank-specific adapter
 *   3. Returns normalized, validated transactions
 *
 * Adding a new bank is a 2-step process:
 *   1. Create a new parser extending BaseParser
 *   2. Register it in the PARSERS array below
 *
 * This is the ingestion adapter pattern from the Itch design doc:
 *   parseToTransactions(rawData) → Transaction[]
 */

// Registry of all available bank parsers
const PARSERS = [
	new HBLParser(),
	new JazzCashParser(),
	// Future: new MeezanParser(), new UBLParser(), new EasypaisaParser()
];

/**
 * Auto-detect the bank format from CSV headers.
 *
 * @param {string} csvString - Raw CSV content
 * @returns {{ parser: BaseParser, bank: string } | null}
 */
const detectBank = (csvString) => {
	// Extract the first line (headers)
	const firstLine = csvString.split(/\r?\n/)[0] || "";
	const headers = firstLine.split(",").map((h) => h.replace(/"/g, "").trim());

	for (const parser of PARSERS) {
		if (parser.canParse(headers)) {
			return { parser, bank: parser.getBankName() };
		}
	}

	return null;
};

/**
 * Parse a CSV file into normalized transactions.
 *
 * @param {string} csvString - Raw CSV content
 * @param {string} [bankHint] - Optional bank name hint (bypasses auto-detection)
 * @returns {Promise<{ bank: string, transactions: ParsedTransaction[], errors: Object[], stats: Object }>}
 * @throws {Error} If bank format cannot be detected
 */
const parseCSV = async (csvString, bankHint = null) => {
	let parser, bank;

	if (bankHint) {
		// Use the specified bank parser
		const hintLower = bankHint.toLowerCase();
		const found = PARSERS.find(
			(p) => p.getBankName().toLowerCase() === hintLower,
		);

		if (!found) {
			const supported = PARSERS.map((p) => p.getBankName()).join(", ");
			throw new Error(
				`Unsupported bank: "${bankHint}". Supported banks: ${supported}`,
			);
		}

		parser = found;
		bank = found.getBankName();
	} else {
		// Auto-detect from headers
		const detected = detectBank(csvString);
		if (!detected) {
			const supported = PARSERS.map((p) => p.getBankName()).join(", ");
			throw new Error(
				`Could not auto-detect bank format. Supported banks: ${supported}. ` +
				`Try specifying the bank explicitly.`,
			);
		}
		parser = detected.parser;
		bank = detected.bank;
	}

	// Parse the CSV
	const rawTransactions = await parser.parse(csvString);

	// Validate parsed rows
	const { valid, errors } = parser.validate(rawTransactions);

	return {
		bank,
		transactions: valid,
		errors,
		stats: {
			totalRows: rawTransactions.length,
			validRows: valid.length,
			errorRows: errors.length,
			totalDebitPaisas: valid
				.filter((t) => t.type === "debit")
				.reduce((sum, t) => sum + t.amountPaisas, 0),
			totalCreditPaisas: valid
				.filter((t) => t.type === "credit")
				.reduce((sum, t) => sum + t.amountPaisas, 0),
		},
	};
};

/**
 * Get list of supported banks.
 * @returns {string[]}
 */
const getSupportedBanks = () => {
	return PARSERS.map((p) => p.getBankName());
};

module.exports = {
	parseCSV,
	detectBank,
	getSupportedBanks,
};
