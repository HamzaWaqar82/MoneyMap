const BaseParser = require("../../../services/parsers/BaseParser");

/**
 * Unit Tests — BaseParser
 *
 * Tests the shared utilities that all bank parsers depend on:
 * amount conversion, date parsing, BOM removal, validation, dedup.
 */
describe("BaseParser", () => {
	let parser;

	beforeEach(() => {
		parser = new BaseParser();
	});

	// ── Amount Conversion (paisas) ──
	describe("normalizeAmount", () => {
		test("converts simple PKR amount to paisas", () => {
			expect(parser.normalizeAmount("850.50")).toBe(85050);
		});

		test("converts integer amount to paisas", () => {
			expect(parser.normalizeAmount("1000")).toBe(100000);
		});

		test("handles 1 paisa correctly (0.01 PKR)", () => {
			expect(parser.normalizeAmount("0.01")).toBe(1);
		});

		test("handles large amounts without floating-point drift", () => {
			expect(parser.normalizeAmount("99999.99")).toBe(9999999);
		});

		test("handles amounts with commas", () => {
			expect(parser.normalizeAmount("1,250.75")).toBe(125075);
		});

		test("handles amounts with PKR prefix", () => {
			expect(parser.normalizeAmount("PKR 500.00")).toBe(50000);
		});

		test("handles amounts with Rs prefix", () => {
			expect(parser.normalizeAmount("Rs 350")).toBe(35000);
		});

		test("handles amounts with ₨ symbol", () => {
			expect(parser.normalizeAmount("₨850.50")).toBe(85050);
		});

		test("returns 0 for empty string", () => {
			expect(parser.normalizeAmount("")).toBe(0);
		});

		test("returns 0 for null", () => {
			expect(parser.normalizeAmount(null)).toBe(0);
		});

		test("returns 0 for undefined", () => {
			expect(parser.normalizeAmount(undefined)).toBe(0);
		});

		test("returns 0 for dash (common in bank CSVs)", () => {
			expect(parser.normalizeAmount("-")).toBe(0);
		});

		test("returns 0 for NaN string", () => {
			expect(parser.normalizeAmount("abc")).toBe(0);
		});

		test("handles whitespace-padded amounts", () => {
			expect(parser.normalizeAmount("  500.00  ")).toBe(50000);
		});

		// Critical: the infamous 0.1 + 0.2 problem
		test("avoids floating-point arithmetic bug", () => {
			// In raw JS: 0.1 + 0.2 = 0.30000000000000004
			// Our normalizeAmount should give exact integer paisas
			const tenPaisas = parser.normalizeAmount("0.10");
			const twentyPaisas = parser.normalizeAmount("0.20");
			expect(tenPaisas + twentyPaisas).toBe(30); // Exact, no floating-point drift
		});
	});

	// ── Date Parsing ──
	describe("parseDate", () => {
		test("parses DD/MM/YYYY (HBL format)", () => {
			const date = parser.parseDate("20/05/2026");
			expect(date).toBeInstanceOf(Date);
			expect(date.getFullYear()).toBe(2026);
			expect(date.getMonth()).toBe(4); // 0-indexed: May = 4
			expect(date.getDate()).toBe(20);
		});

		test("parses YYYY-MM-DD (JazzCash format)", () => {
			const date = parser.parseDate("2026-05-22");
			expect(date).toBeInstanceOf(Date);
			expect(date.getFullYear()).toBe(2026);
			expect(date.getMonth()).toBe(4);
			expect(date.getDate()).toBe(22);
		});

		test("parses DD-Mon-YYYY format", () => {
			const date = parser.parseDate("22-May-2026");
			expect(date).toBeInstanceOf(Date);
			expect(date.getFullYear()).toBe(2026);
			expect(date.getMonth()).toBe(4);
			expect(date.getDate()).toBe(22);
		});

		test("handles quoted dates", () => {
			const date = parser.parseDate('"22/05/2026"');
			expect(date).toBeInstanceOf(Date);
		});

		test("returns null for empty string", () => {
			expect(parser.parseDate("")).toBeNull();
		});

		test("returns null for null", () => {
			expect(parser.parseDate(null)).toBeNull();
		});

		test("returns null for invalid date string", () => {
			expect(parser.parseDate("not-a-date")).toBeNull();
		});

		test("returns null for number input", () => {
			expect(parser.parseDate(12345)).toBeNull();
		});
	});

	// ── BOM Removal ──
	describe("removeBOM", () => {
		test("removes UTF-8 BOM from start of content", () => {
			const withBOM = "\uFEFFValue Date,Transaction Date";
			expect(parser.removeBOM(withBOM)).toBe("Value Date,Transaction Date");
		});

		test("leaves content without BOM unchanged", () => {
			const withoutBOM = "Value Date,Transaction Date";
			expect(parser.removeBOM(withoutBOM)).toBe(withoutBOM);
		});
	});

	// ── Validation ──
	describe("validate", () => {
		test("accepts valid rows", () => {
			const rows = [
				{ date: new Date(), description: "Test", amountPaisas: 50000, type: "debit" },
			];
			const { valid, errors } = parser.validate(rows);
			expect(valid).toHaveLength(1);
			expect(errors).toHaveLength(0);
		});

		test("rejects rows with missing date", () => {
			const rows = [
				{ date: null, description: "Test", amountPaisas: 50000, type: "debit" },
			];
			const { valid, errors } = parser.validate(rows);
			expect(valid).toHaveLength(0);
			expect(errors).toHaveLength(1);
			expect(errors[0].errors).toContain("Missing or invalid date");
		});

		test("rejects rows with zero amount", () => {
			const rows = [
				{ date: new Date(), description: "Test", amountPaisas: 0, type: "debit" },
			];
			const { valid, errors } = parser.validate(rows);
			expect(valid).toHaveLength(0);
			expect(errors).toHaveLength(1);
		});

		test("rejects rows with missing description", () => {
			const rows = [
				{ date: new Date(), description: "", amountPaisas: 50000, type: "debit" },
			];
			const { valid, errors } = parser.validate(rows);
			expect(valid).toHaveLength(0);
			expect(errors).toHaveLength(1);
		});
	});

	// ── Duplicate Detection ──
	describe("detectDuplicates", () => {
		test("detects duplicates by date+amount+description", () => {
			const existing = [
				{
					transactionDate: new Date("2026-05-20"),
					amount: 500,
					description: "POS PURCHASE",
				},
			];
			const newTxns = [
				{
					date: new Date("2026-05-20"),
					amountPaisas: 50000,
					description: "POS PURCHASE",
				},
				{
					date: new Date("2026-05-21"),
					amountPaisas: 100000,
					description: "ATM WITHDRAWAL",
				},
			];

			const { unique, duplicates } = parser.detectDuplicates(newTxns, existing);
			expect(unique).toHaveLength(1);
			expect(duplicates).toHaveLength(1);
		});

		test("handles no duplicates", () => {
			const { unique, duplicates } = parser.detectDuplicates(
				[{ date: new Date("2026-05-20"), amountPaisas: 50000, description: "New" }],
				[],
			);
			expect(unique).toHaveLength(1);
			expect(duplicates).toHaveLength(0);
		});
	});

	// ── Abstract method enforcement ──
	describe("abstract methods", () => {
		test("parse() throws if not implemented", async () => {
			await expect(parser.parse("csv")).rejects.toThrow("not implemented");
		});

		test("getExpectedHeaders() throws if not implemented", () => {
			expect(() => parser.getExpectedHeaders()).toThrow("not implemented");
		});

		test("getBankName() throws if not implemented", () => {
			expect(() => parser.getBankName()).toThrow("not implemented");
		});
	});
});
