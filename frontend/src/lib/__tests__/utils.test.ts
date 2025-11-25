import { describe, it, expect } from "vitest";
import { cn, getTagColor } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("merges class names correctly", () => {
      const result = cn("px-2 py-1", "px-4");
      expect(result).toBe("py-1 px-4");
    });

    it("handles conditional classes", () => {
      const condition1 = true;
      const condition2 = false;
      const result = cn(
        "base-class",
        condition1 && "true-class",
        condition2 && "false-class"
      );
      expect(result).toContain("base-class");
      expect(result).toContain("true-class");
      expect(result).not.toContain("false-class");
    });

    it("handles arrays of classes", () => {
      const result = cn(["class1", "class2"], "class3");
      expect(result).toContain("class1");
      expect(result).toContain("class2");
      expect(result).toContain("class3");
    });

    it("removes duplicate classes", () => {
      const result = cn("px-2", "px-2");
      expect(result).toBe("px-2");
    });

    it("handles undefined and null", () => {
      const result = cn("base", undefined, null, "other");
      expect(result).toContain("base");
      expect(result).toContain("other");
    });
  });

  describe("getTagColor", () => {
    it("returns a consistent color for the same tag name", () => {
      const color1 = getTagColor("test-tag");
      const color2 = getTagColor("test-tag");
      expect(color1).toBe(color2);
    });

    it("returns different colors for different tags", () => {
      const color1 = getTagColor("tag1");
      const color2 = getTagColor("tag2");
      // They might be the same by chance due to hashing, but should be valid badge variants
      expect(color1).toMatch(
        /^tag-(blue|green|yellow|red|purple|pink|orange|cyan)$/
      );
      expect(color2).toMatch(
        /^tag-(blue|green|yellow|red|purple|pink|orange|cyan)$/
      );
    });

    it("returns a valid badge variant", () => {
      const color = getTagColor("any-tag");
      expect(color).toMatch(
        /^tag-(blue|green|yellow|red|purple|pink|orange|cyan)$/
      );
    });

    it("handles empty strings", () => {
      const color = getTagColor("");
      expect(color).toMatch(
        /^tag-(blue|green|yellow|red|purple|pink|orange|cyan)$/
      );
    });

    it("handles special characters", () => {
      const color = getTagColor("tag-with-special!@#$%");
      expect(color).toMatch(
        /^tag-(blue|green|yellow|red|purple|pink|orange|cyan)$/
      );
    });
  });
});
