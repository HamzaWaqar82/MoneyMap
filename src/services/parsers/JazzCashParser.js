const { parse } = require("csv-parse/sync");
const BaseParser = require("./BaseParser");

/**
 * JazzCash CSV Parser
 *
 * Expected CSV format (converted from PDF e-statement):
 *   Date,Description,Type,Debit,Credit,Fee,Balance,Transaction ID
 *   "2026-05-22","Money Transfer to 03001234567","Money Transfer","500.00","0.00","0.00","1425.50","073230904128"
 *   "2026-05-23","Incoming IBFT Credit","IBFT Credit","0.00","2500.00","0.00","3925.50","073264193070"
 *   "2026-05-24","Customer buys Zong bundle","Jazz Load","150.00","0.00","0.00","3775.50","073293126563"
 *
 * Key characteristics:
 *   - Dates in YYYY-MM-DD format (quoted)
 *   - All values quoted
 *   - Includes Transaction ID (reference number)
 *   - Has Fee column (we include fees in the total debit)
 *   - Type column helps with categorization
 */
class JazzCashParser extends BaseParser {
	getBankName() {
		return "JazzCash";
	}

	getExpectedHeaders() {
		return ["date", "description", "debit", "credit", "balance", "transaction id"];
	}

	/**
	 * Parse JazzCash CSV string into normalized transactions.
	 *
	 * @param {string} csvString - Raw CSV content from JazzCash statement
	 * @returns {Promise<import('./BaseParser').ParsedTransaction[]>}
	 */
	async parse(csvString) {
		const content = this.removeBOM(csvString);

		const records = parse(content, {
			columns: true,
			skip_empty_lines: true,
			trim: true,
			relax_column_count: true,
			relax_quotes: true,
		});

		const transactions = [];

		for (const record of records) {
			// Normalize header casing
			const normalized = {};
			for (const [key, value] of Object.entries(record)) {
				normalized[key.toLowerCase().trim()] = (value || "").replace(/^"|"$/g, "").trim();
			}

			const description = (
				normalized["description"] || ""
			).trim();

			// Skip empty rows
			if (!description) continue;

			const debitStr = normalized["debit"] || "0";
			const creditStr = normalized["credit"] || "0";
			const feeStr = normalized["fee"] || "0";

			const debitPaisas = this.normalizeAmount(debitStr);
			const creditPaisas = this.normalizeAmount(creditStr);
			const feePaisas = this.normalizeAmount(feeStr);

			const dateStr = normalized["date"] || normalized["date/time"] || "";
			const date = this.parseDate(dateStr);
			if (!date) continue;

			// Transaction ID is a valuable reference number for dedup
			const rawRef = normalized["transaction id"] || normalized["txn id"] || null;

			// Determine type and amount
			let type, amountPaisas;
			if (debitPaisas > 0) {
				type = "debit";
				// Include fees in the debit amount — user paid that money
				amountPaisas = debitPaisas + feePaisas;
			} else if (creditPaisas > 0) {
				type = "credit";
				amountPaisas = creditPaisas;
			} else {
				// Skip zero-amount entries
				continue;
			}

			// Enhance description with JazzCash transaction type if available
			const txnType = normalized["type"] || "";
			const enhancedDescription = txnType && !description.toLowerCase().includes(txnType.toLowerCase())
				? `${description} [${txnType}]`
				: description;

			transactions.push({
				date,
				description: enhancedDescription,
				amountPaisas,
				type,
				rawRef,
				source: "csv",
				bank: this.getBankName(),
			});
		}

		return transactions;
	}
}

module.exports = JazzCashParser;
