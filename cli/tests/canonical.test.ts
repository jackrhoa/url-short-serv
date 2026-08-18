import { describe, it, expect } from "vitest";
import { buildCanonical } from "../../shared/canonical.ts";

const VALID = ["1755230400", "POST", "/", "abc123"] as const;

function withField(index: number, value: string) {
	const fields: string[] = [...VALID];
	fields[index] = value;
	return fields as [string, string, string, string];
}

describe("buildCanonical", () => {
	it("joins fields with newlines", () => {
		expect(buildCanonical(...VALID)).toBe("1755230400\nPOST\n/\nabc123");
	});

	it("allows backslashes", () => {
		expect(buildCanonical("1755230400", "POST", "/a\\b", "abc123")).toBe(
			"1755230400\nPOST\n/a\\b\nabc123",
		);
	});

	describe.each([
		{ name: "timestamp", index: 0 },
		{ name: "method", index: 1 },
		{ name: "path", index: 2 },
		{ name: "bodyHash", index: 3 },
	])("$name", ({ index }) => {
		it("rejects a line feed", () => {
			expect(() => buildCanonical(...withField(index, "a\nb"))).toThrow(
				/newline/i,
			);
		});

		it("rejects a carriage return", () => {
			expect(() => buildCanonical(...withField(index, "a\rb"))).toThrow(
				/newline/i,
			);
		});
	});

	it("cannot produce the same canonical string from different fields", () => {
		expect(() =>
			buildCanonical("1755230400", "POST", "/", "abc\nXYZ"),
		).toThrow();
		expect(() =>
			buildCanonical("1755230400", "POST", "/\nabc", "XYZ"),
		).toThrow();
	});
})
