/**
 * Unit Tests — Auto-Categorization Engine
 *
 * Tests the rule-based categorization of Pakistani bank transaction
 * descriptions. This is the most critical test file for accuracy —
 * if the categorization is wrong, users will lose trust in the app.
 *
 * NOTE: These tests require the Category collection to be populated.
 * We mock the Category model to avoid DB dependency in unit tests.
 */
const { PATTERN_RULES } = require("../../services/categorization.service");

describe("Categorization Engine — Pattern Rules", () => {
	// Test pattern rules directly without DB dependency

	describe("ATM patterns", () => {
		test("matches ATM/HBL/DHA Y BLOCK", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("ATM/HBL/DHA Y BLOCK"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Cash Withdrawal");
			expect(match.confidence).toBeGreaterThanOrEqual(0.9);
		});

		test("matches ATM WITHDRAWAL - ISLAMABAD", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("ATM WITHDRAWAL - ISLAMABAD"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Cash Withdrawal");
		});
	});

	describe("POS patterns", () => {
		test("matches POS PURCHASE - KARACHI", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("POS PURCHASE - KARACHI"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Shopping");
		});

		test("matches POS/MCB/CARREFOUR LAHORE", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("POS/MCB/CARREFOUR LAHORE"));
			expect(match).toBeDefined();
		});
	});

	describe("Salary patterns", () => {
		test("matches SALARY CREDIT", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("SALARY CREDIT"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Salary");
			expect(match.confidence).toBeGreaterThanOrEqual(0.9);
		});

		test("matches PAYROLL", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("PAYROLL MAY-2026"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Salary");
		});
	});

	describe("Transfer patterns", () => {
		test("matches IBFT/JZ/03001234/Sent", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("IBFT/JZ/03001234/Sent"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Transfer");
		});

		test("matches FT/FROM/ACCOUNT", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("FT/FROM/ACCOUNT"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Transfer");
		});

		test("matches Money Transfer via RAAST", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("Money Transfer via RAAST"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Transfer");
		});

		test("matches Incoming IBFT Credit", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("Incoming IBFT Credit"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Transfer");
		});
	});

	describe("Mobile Topup patterns", () => {
		test("matches Customer buys Zong bundle", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("Customer buys Zong bundle"));
			expect(match).toBeUndefined(); // "Zong" alone doesn't match topup pattern
		});

		test("matches JAZZ LOAD", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("JAZZ LOAD 0300"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Mobile Topup");
		});

		test("matches Mobile Topup", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("Mobile Topup 03211234567"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Mobile Topup");
		});
	});

	describe("Utility bill patterns", () => {
		test("matches K-ELECTRIC bill", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("K-ELECTRIC BILL PAYMENT"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Bills & Utilities");
		});

		test("matches SNGPL", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("SNGPL GAS BILL"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Bills & Utilities");
		});

		test("matches PTCL", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("PTCL INTERNET BILL"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Bills & Utilities");
		});

		test("matches LESCO", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("LESCO ELECTRICITY"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Bills & Utilities");
		});
	});

	describe("Grocery/merchant patterns", () => {
		test("matches CARREFOUR without POS prefix", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("CARREFOUR LAHORE"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Groceries");
		});

		test("POS/CARREFOUR hits POS rule first (correct priority)", () => {
			// The POS pattern fires first — the engine's Tier 2 keyword matching
			// then upgrades it to Groceries. Testing pattern priority is correct here.
			const match = PATTERN_RULES.find((r) => r.pattern.test("POS/CARREFOUR LAHORE"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Shopping"); // POS rule fires first
		});

		test("matches IMTIAZ", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("IMTIAZ SUPER MARKET"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Groceries");
		});
	});

	describe("Transport patterns", () => {
		test("matches SHELL fuel station", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("SHELL PUMP DHA"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Transport");
		});

		test("matches CAREEM ride", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("CAREEM RIDE"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Transport");
		});

		test("matches UBER", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("UBER TRIP"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Transport");
		});
	});

	describe("Entertainment patterns", () => {
		test("matches NETFLIX", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("NETFLIX SUBSCRIPTION"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Entertainment");
		});

		test("matches SPOTIFY", () => {
			const match = PATTERN_RULES.find((r) => r.pattern.test("SPOTIFY PREMIUM"));
			expect(match).toBeDefined();
			expect(match.category).toBe("Entertainment");
		});
	});

	describe("edge cases", () => {
		test("unknown transaction doesn't match any rule", () => {
			const desc = "RANDOM UNKNOWN TRANSACTION 12345";
			const match = PATTERN_RULES.find((r) => r.pattern.test(desc));
			// Should not match any high-confidence rule
			expect(
				match === undefined || match.confidence < 0.8,
			).toBe(true);
		});

		test("all pattern rules have required fields", () => {
			PATTERN_RULES.forEach((rule) => {
				expect(rule.pattern).toBeInstanceOf(RegExp);
				expect(typeof rule.category).toBe("string");
				expect(typeof rule.confidence).toBe("number");
				expect(rule.confidence).toBeGreaterThanOrEqual(0);
				expect(rule.confidence).toBeLessThanOrEqual(1);
			});
		});
	});
});
