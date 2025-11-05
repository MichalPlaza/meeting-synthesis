import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("should return initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 500));
    expect(result.current).toBe("initial");
  });

  it("should debounce value changes", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    expect(result.current).toBe("initial");

    // Update value
    act(() => {
      rerender({ value: "updated", delay: 500 });
    });

    expect(result.current).toBe("initial"); // Still old value

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("updated");
  });

  it("should cancel previous timeout on rapid changes", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "first", delay: 500 } }
    );

    act(() => {
      rerender({ value: "second", delay: 500 });
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    act(() => {
      rerender({ value: "third", delay: 500 });
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Should still be initial value
    expect(result.current).toBe("first");

    // Complete the timeout
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current).toBe("third");
  });

  it("should work with different data types", () => {
    // Test with number
    const { result: numberResult } = renderHook(() => useDebounce(123, 300));
    expect(numberResult.current).toBe(123);

    // Test with object
    const obj = { name: "test" };
    const { result: objectResult } = renderHook(() => useDebounce(obj, 300));
    expect(objectResult.current).toEqual(obj);

    // Test with array
    const arr = [1, 2, 3];
    const { result: arrayResult } = renderHook(() => useDebounce(arr, 300));
    expect(arrayResult.current).toEqual(arr);
  });

  it("should handle delay changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "test", delay: 500 } }
    );

    act(() => {
      rerender({ value: "updated", delay: 1000 });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("test"); // Still waiting

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("updated");
  });
});
