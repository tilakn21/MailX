import { describe, it, expect } from "vitest";
import {
  removeExcessiveWhitespace,
  truncate,
  generalizeSubject,
} from "./string";

// Run with:
// pnpm test utils/string.test.ts

describe("string utils", () => {
  describe("truncate", () => {
    it("should truncate strings longer than specified length", () => {
      expect(truncate("hello world", 5)).toBe("hello...");
    });

    it("should not truncate strings shorter than specified length", () => {
      expect(truncate("hello", 10)).toBe("hello");
    });
  });

  describe("removeExcessiveWhitespace", () => {
    it("should collapse multiple spaces into single space", () => {
      expect(removeExcessiveWhitespace("hello    world")).toBe("hello world");
    });

    it("should preserve single newlines", () => {
      expect(removeExcessiveWhitespace("hello\nworld")).toBe("hello\nworld");
    });

    it("should collapse multiple newlines into double newlines", () => {
      expect(removeExcessiveWhitespace("hello\n\n\n\nworld")).toBe(
        "hello\n\nworld",
      );
    });

    it("should remove zero-width spaces", () => {
      expect(removeExcessiveWhitespace("hello\u200Bworld")).toBe("hello world");
    });

    it("should handle complex cases with multiple types of whitespace", () => {
      const input = "hello   world\n\n\n\n  next    line\u200B\u200B  test";
      expect(removeExcessiveWhitespace(input)).toBe(
        "hello world\n\nnext line test",
      );
    });

    it("should trim leading and trailing whitespace", () => {
      expect(removeExcessiveWhitespace("  hello world  ")).toBe("hello world");
    });

    it("should handle empty string", () => {
      expect(removeExcessiveWhitespace("")).toBe("");
    });

    it("should handle string with only whitespace", () => {
      expect(removeExcessiveWhitespace("   \n\n   \u200B   ")).toBe("");
    });

    it("should handle soft hyphens and other special characters", () => {
      const input = "hello\u00ADworld\u034Ftest\u200B\u200Cspace";
      expect(removeExcessiveWhitespace(input)).toBe("hello world test space");
    });

    it("should handle mixed special characters and whitespace", () => {
      const input = "hello\u00AD   world\n\n\u034F\n\u200B  test";
      expect(removeExcessiveWhitespace(input)).toBe("hello world\n\ntest");
    });
  });
  describe("generalizeSubject", () => {
    it("should remove numbers and IDs", () => {
      expect(generalizeSubject("Order #123")).toBe("Order");
      expect(generalizeSubject("Invoice 456")).toBe("Invoice");
      expect(generalizeSubject("[org/repo] PR #789: Fix bug (abc123)")).toBe(
        "[org/repo] PR : Fix bug",
      );
    });

    it("should preserve normal text", () => {
      expect(generalizeSubject("Welcome to our service")).toBe(
        "Welcome to our service",
      );
      expect(generalizeSubject("Your account has been created")).toBe(
        "Your account has been created",
      );
    });
  });
});
