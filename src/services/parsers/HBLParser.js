const { parse } = require("csv-parse/sync");
const BaseParser = require("./BaseParser");

/**
 * HBL (Habib Bank Limited) CSV Parser
 *
 * Expected CSV format:
 *   Value Date,Transaction Date,Description,Withdrawals,Deposits,Balance
 *   20/05/2026,20/05/2026,POS PURCHASE - KARACHI,500.00,,45000.00
 *   21/05/2026,21/05/2026,ATM WITHDRAWAL - ISLAMABAD,1000.00,,44000.00
 *   22/05/2026,22/05/2026,SALARY CREDIT,,50000.00,94000.00
 *
 * Key characteristics:
 *   - Dates in DD/MM/YYYY format
 *   - Withdrawals and Deposits in separate columns
 *   - Balance is running total
 *   - Descriptions contain branch/merchant info
 */
class HBLParser extends BaseParser {
	getBankName() {
		return "HBL";
	}

	getExpectedHeaders() {
		return ["value date", "transaction date", "description", "withdrawals", "deposits", "balance"];
	}

	/**
	 * Parse HBL CSV string into normalized transactions.
	 *
	 * @param {string} csvString - Raw CSV content from HBL statement
	 * @returns {Promise<import('./BaseParser').ParsedTransaction[]>}
	 */
	async parse(csvString) {
		const content = this.removeBOM(csvString);

		const records = parse(content, {
			columns: true,
			skip_empty_lines: true,
			trim: true,
			relax_column_count: true,
		});

		const transactions = [];

		for (const record of records) {
			// HBL headers can vary in casing — normalize
			const normalized = {};
			for (const [key, value] of Object.entries(record)) {
				normalized[key.toLowerCase().trim()] = value;
			}

			const description = (
				normalized["description"] ||
				normalized["particulars"] ||
				normalized["desc"] ||
				""
			).trim();

			// Skip empty rows
			if (!description) continue;

			const withdrawalStr =
				normalized["withdrawals"] ||
				normalized["withdrawal"] ||
				normalized["debit"] ||
				normalized["dr"] ||
				"";
			const depositStr =
				normalized["deposits"] ||
				normalized["deposit"] ||
				normalized["credit"] ||
				normalized["cr"] ||
				"";

			const withdrawalPaisas = this.normalizeAmount(withdrawalStr);
			const depositPaisas = this.normalizeAmount(depositStr);

			// Use Transaction Date if available, fallback to Value Date
			const dateStr =
				normalized["transaction date"] ||
				normalized["trans date"] ||
				normalized["value date"] ||
				normalized["date"] ||
				"";

			const date = this.parseDate(dateStr);
			if (!date) continue;

			// Determine type and amount
			let type, amountPaisas;
			if (withdrawalPaisas > 0) {
				type = "debit";
				amountPaisas = withdrawalPaisas;
			} else if (depositPaisas > 0) {
				type = "credit";
				amountPaisas = depositPaisas;
			} else {
				// Skip zero-amount entries (e.g., balance-only rows)
				continue;
			}

			transactions.push({
				date,
				description,
				amountPaisas,
				type,
				rawRef: null, // HBL CSV doesn't include reference numbers
				source: "csv",
				bank: this.getBankName(),
			});
		}

		return transactions;
	}
}

module.exports = HBLParser;
