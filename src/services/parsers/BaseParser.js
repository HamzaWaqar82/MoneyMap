/**
 * BaseParser — Abstract base class for bank CSV ingestion adapters.
 *
 * Every bank parser must extend this class and implement:
 *   - parse(csvString) → ParsedTransaction[]
 *   - getExpectedHeaders() → string[]
 *   - getBankName() → string
 *
 * The adapter pattern:
 *   parseToTransactions(rawData) → Transaction[]
 *
 * This is the core architectural pattern from the Itch design doc.
 * Adding a new bank is as simple as creating a new parser that extends BaseParser.
 */
class BaseParser {
	/**
	 * Parse a CSV string into an array of normalized transaction objects.
	 * MUST be implemented by each bank parser subclass.
	 *
	 * @param {string} csvString - Raw CSV content
	 * @returns {Promise<ParsedTransaction[]>}
	 */
	async parse(csvString) {
		throw new Error(
			`${this.constructor.name}.parse() not implemented. Each bank parser must implement this method.`,
		);
	}

	/**
	 * Return the expected CSV column headers for format detection.
	 * MUST be implemented by each bank parser subclass.
	 *
	 * @returns {string[]} Array of expected header column names
	 */
	getExpectedHeaders() {
		throw new Error(
			`${this.constructor.name}.getExpectedHeaders() not implemented.`,
		);
	}

	/**
	 * Return the bank/provider name.
	 * MUST be implemented by each bank parser subclass.
	 *
	 * @returns {string} Bank name (e.g., "HBL", "JazzCash")
	 */
	getBankName() {
		throw new Error(
			`${this.constructor.name}.getBankName() not implemented.`,
		);
	}

	/**
	 * Check if this parser can handle the given CSV headers.
	 *
	 * @param {string[]} headers - Actual headers from the CSV file
	 * @returns {boolean} True if this parser can handle this CSV format
	 */
	canParse(headers) {
		const expected = this.getExpectedHeaders().map((h) =>
			h.toLowerCase().trim(),
		);
		const actual = headers.map((h) => h.toLowerCase().trim());

		// Check if all expected headers exist in the actual headers
		return expected.every((eh) => actual.some((ah) => ah.includes(eh)));
	}

	/**
	 * Convert a monetary value to integer paisas.
	 * ₨850.50 → 85050
	 * Avoids floating-point arithmetic bugs in financial calculations.
	 *
	 * @param {string|number} value - Amount as string or number
	 * @returns {number} Integer amount in paisas
	 */
	normalizeAmount(value) {
		if (value === null || value === undefined || value === "") {
			return 0;
		}

		// Remove commas, currency symbols, whitespace
		const cleaned = String(value)
			.replace(/[,\s₨RSPKR]/gi, "")
			.trim();

		if (cleaned === "" || cleaned === "-") {
			return 0;
		}

		const float = parseFloat(cleaned);
		if (isNaN(float)) {
			return 0;
		}

		// Convert to paisas: multiply by 100 and round to avoid floating-point issues
		// Math.round is critical here — parseFloat(850.50) * 100 might give 85049.99999
		return Math.round(float * 100);
	}

	/**
	 * Parse a date string in various Pakistani bank formats.
	 *
	 * Supported formats:
	 *   - DD/MM/YYYY (HBL, Meezan)
	 *   - YYYY-MM-DD (JazzCash)
	 *   - DD-Mon-YYYY (e.g., 22-May-2026)
	 *
	 * @param {string} dateStr - Raw date string from bank CSV
	 * @returns {Date|null} Parsed Date object or null if invalid
	 */
	parseDate(dateStr) {
		if (!dateStr || typeof dateStr !== "string") {
			return null;
		}

		const cleaned = dateStr.trim().replace(/"/g, "");

		// Try YYYY-MM-DD (ISO format, used by JazzCash)
		if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
			const d = new Date(cleaned + "T00:00:00");
			return isNaN(d.getTime()) ? null : d;
		}

		// Try DD/MM/YYYY (HBL format)
		const ddmmyyyy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
		if (ddmmyyyy) {
			const [, day, month, year] = ddmmyyyy;
			const d = new Date(
				parseInt(year),
				parseInt(month) - 1,
				parseInt(day),
			);
			return isNaN(d.getTime()) ? null : d;
		}

		// Try DD-Mon-YYYY (e.g., 22-May-2026)
		const months = {
			jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
			jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
		};
		const ddmonyyyy = cleaned.match(
			/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/,
		);
		if (ddmonyyyy) {
			const [, day, mon, year] = ddmonyyyy;
			const monthIdx = months[mon.toLowerCase()];
			if (monthIdx !== undefined) {
				const d = new Date(parseInt(year), monthIdx, parseInt(day));
				return isNaN(d.getTime()) ? null : d;
			}
		}

		return null;
	}

	/**
	 * Validate parsed rows for required fields.
	 *
	 * @param {ParsedTransaction[]} rows - Array of parsed transactions
	 * @returns {{ valid: ParsedTransaction[], errors: Object[] }}
	 */
	validate(rows) {
		const valid = [];
		const errors = [];

		rows.forEach((row, index) => {
			const rowErrors = [];

			if (!row.date) {
				rowErrors.push("Missing or invalid date");
			}
			if (!row.amountPaisas || row.amountPaisas === 0) {
				rowErrors.push("Missing or zero amount");
			}
			if (!row.description || row.description.trim() === "") {
				rowErrors.push("Missing description");
			}

			if (rowErrors.length > 0) {
				errors.push({ row: index + 1, errors: rowErrors, data: row });
			} else {
				valid.push(row);
			}
		});

		return { valid, errors };
	}

	/**
	 * Detect duplicate transactions by comparing against existing ones.
	 * Uses date + amount + description hash for matching.
	 *
	 * @param {ParsedTransaction[]} newTxns - Newly parsed transactions
	 * @param {Object[]} existingTxns - Existing transactions from DB
	 * @returns {{ unique: ParsedTransaction[], duplicates: ParsedTransaction[] }}
	 */
	detectDuplicates(newTxns, existingTxns) {
		const existingSet = new Set();
		existingTxns.forEach((txn) => {
			const key = `${txn.transactionDate?.toISOString()?.split("T")[0]}_${txn.amountPaisas || Math.round((txn.amount || 0) * 100)}_${(txn.description || "").toLowerCase().trim()}`;
			existingSet.add(key);
		});

		const unique = [];
		const duplicates = [];

		newTxns.forEach((txn) => {
			const key = `${txn.date?.toISOString()?.split("T")[0]}_${txn.amountPaisas}_${(txn.description || "").toLowerCase().trim()}`;
			if (existingSet.has(key)) {
				duplicates.push(txn);
			} else {
				unique.push(txn);
			}
		});

		return { unique, duplicates };
	}

	/**
	 * Remove BOM (Byte Order Mark) from CSV content.
	 * Many Windows-exported CSVs include a BOM character at the start.
	 *
	 * @param {string} content - Raw CSV content
	 * @returns {string} Cleaned content
	 */
	removeBOM(content) {
		if (content.charCodeAt(0) === 0xfeff) {
			return content.slice(1);
		}
		return content;
	}
}

/**
 * @typedef {Object} ParsedTransaction
 * @property {Date} date - Transaction date
 * @property {string} description - Raw transaction description from bank
 * @property {number} amountPaisas - Amount in integer paisas (positive)
 * @property {string} type - "debit" or "credit"
 * @property {string|null} rawRef - Bank reference number if available
 * @property {string} source - Always "csv"
 */

module.exports = BaseParser;
