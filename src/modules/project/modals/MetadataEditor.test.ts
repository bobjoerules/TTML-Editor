import { describe, expect, it } from "vitest";
import { parseDelimitedValues, reorderArray } from "./MetadataEditor";

describe("MetadataEditor utilities", () => {
	describe("parseDelimitedValues", () => {
		it("splits by comma, semicolons, pipes, and newlines", () => {
			const input = "Max Martin, Shellback; Dr. Luke\nSavan Kotecha | Ilya";
			expect(parseDelimitedValues(input)).toEqual([
				"Max Martin",
				"Shellback",
				"Dr. Luke",
				"Savan Kotecha",
				"Ilya",
			]);
		});

		it("handles Chinese punctuation delimiters", () => {
			const input = "林夕，方文山；黄伟文、李宗盛";
			expect(parseDelimitedValues(input)).toEqual([
				"林夕",
				"方文山",
				"黄伟文",
				"李宗盛",
			]);
		});

		it("filters out empty entries and trims whitespace", () => {
			expect(parseDelimitedValues("  Alice  , , Bob ;  \n ")).toEqual([
				"Alice",
				"Bob",
			]);
		});
	});

	describe("reorderArray", () => {
		it("moves an element forward in the array", () => {
			const list = ["A", "B", "C", "D"];
			expect(reorderArray(list, 0, 2)).toEqual(["B", "C", "A", "D"]);
		});

		it("moves an element backward in the array", () => {
			const list = ["A", "B", "C", "D"];
			expect(reorderArray(list, 3, 1)).toEqual(["A", "D", "B", "C"]);
		});

		it("moves an element to adjacent position", () => {
			const list = ["Songwriter 1", "Songwriter 2", "Songwriter 3"];
			expect(reorderArray(list, 1, 0)).toEqual([
				"Songwriter 2",
				"Songwriter 1",
				"Songwriter 3",
			]);
			expect(reorderArray(list, 1, 2)).toEqual([
				"Songwriter 1",
				"Songwriter 3",
				"Songwriter 2",
			]);
		});

		it("returns unchanged array if indices are identical or invalid", () => {
			const list = ["A", "B", "C"];
			expect(reorderArray(list, 1, 1)).toEqual(["A", "B", "C"]);
			expect(reorderArray(list, -1, 1)).toEqual(["A", "B", "C"]);
			expect(reorderArray(list, 0, 5)).toEqual(["A", "B", "C"]);
		});
	});
});
