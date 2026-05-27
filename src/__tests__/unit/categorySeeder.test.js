const { SYSTEM_CATEGORIES } = require("../../seeds/categorySeeder");

/**
 * Unit Tests — Category Seeder Data Integrity
 *
 * Validates that the seed data is well-formed before it touches the database.
 */
describe("Category Seeder Data", () => {
	test("has at least 15 system categories", () => {
		expect(SYSTEM_CATEGORIES.length).toBeGreaterThanOrEqual(15);
	});

	test("all categories have required fields", () => {
		SYSTEM_CATEGORIES.forEach((cat) => {
			expect(cat.name).toBeDefined();
			expect(typeof cat.name).toBe("string");
			expect(cat.name.length).toBeGreaterThan(0);

			expect(cat.icon).toBeDefined();
			expect(typeof cat.icon).toBe("string");

			expect(cat.color).toBeDefined();
			expect(cat.color).toMatch(/^#[A-Fa-f0-9]{6}$/);

			expect(cat.type).toBeDefined();
			expect(["income", "expense", "both"]).toContain(cat.type);

			expect(cat.keywords).toBeDefined();
			expect(Array.isArray(cat.keywords)).toBe(true);
		});
	});

	test("category names are unique", () => {
		const names = SYSTEM_CATEGORIES.map((c) => c.name);
		const unique = new Set(names);
		expect(unique.size).toBe(names.length);
	});

	test("has Pakistan-specific categories", () => {
		const names = SYSTEM_CATEGORIES.map((c) => c.name);
		expect(names).toContain("Kiryana Store");
		expect(names).toContain("Chai & Nashta");
		expect(names).toContain("Mobile Topup");
		expect(names).toContain("Bills & Utilities");
	});

	test("has both income and expense categories", () => {
		const incomeCategories = SYSTEM_CATEGORIES.filter((c) => c.type === "income");
		const expenseCategories = SYSTEM_CATEGORIES.filter((c) => c.type === "expense");
		expect(incomeCategories.length).toBeGreaterThanOrEqual(3);
		expect(expenseCategories.length).toBeGreaterThanOrEqual(10);
	});

	test("has a fallback 'Other' category", () => {
		const other = SYSTEM_CATEGORIES.find((c) => c.name === "Other");
		expect(other).toBeDefined();
		expect(other.type).toBe("both");
		expect(other.keywords).toHaveLength(0);
	});

	test("all keywords are lowercase-friendly strings", () => {
		SYSTEM_CATEGORIES.forEach((cat) => {
			cat.keywords.forEach((kw) => {
				expect(typeof kw).toBe("string");
				expect(kw.length).toBeGreaterThan(0);
				expect(kw.length).toBeLessThanOrEqual(100);
			});
		});
	});
});
