import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useReactQuerySubscribe,
  clearAllSubscriptions,
} from "../useReactQuerySubscribe";

// Mock the hashKey function
vi.mock("@twain/react-query", () => ({
  hashKey: vi.fn((key) => `hash_${JSON.stringify(key)}`),
}));

describe("useReactQuerySubscribe", () => {
  let mockSubscribeFn: ReturnType<typeof vi.fn>;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear all subscriptions before each test
    clearAllSubscriptions();

    // Reset mocks
    mockUnsubscribe = vi.fn();
    mockSubscribeFn = vi.fn(() => mockUnsubscribe);

    vi.clearAllMocks();
  });

  afterEach(() => {
    clearAllSubscriptions();
  });

  describe("basic functionality", () => {
    it("should create subscription when enabled by default", () => {
      const subscriptionKey = ["test-key"];

      renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);
    });

    it("should create subscription when enabled is true", () => {
      const subscriptionKey = ["test-key"];

      renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey,
          subscribeFn: mockSubscribeFn,
          enabled: true,
        })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);
    });

    it("should not create subscription when enabled is false", () => {
      const subscriptionKey = ["test-key"];

      renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey,
          subscribeFn: mockSubscribeFn,
          enabled: false,
        })
      );

      expect(mockSubscribeFn).not.toHaveBeenCalled();
    });

    it("should reuse existing subscription for same key", () => {
      const subscriptionKey = ["test-key"];

      // First hook
      renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      // Second hook with same key
      renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);
    });

    it("should create separate subscriptions for different keys", () => {
      const subscriptionKey1 = ["key1"];
      const subscriptionKey2 = ["key2"];
      const mockUnsubscribe2 = vi.fn();
      const mockSubscribeFn2 = vi.fn(() => mockUnsubscribe2);

      renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey: subscriptionKey1,
          subscribeFn: mockSubscribeFn,
        })
      );

      renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey: subscriptionKey2,
          subscribeFn: mockSubscribeFn2,
        })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);
      expect(mockSubscribeFn2).toHaveBeenCalledTimes(1);
    });
  });

  describe("enabled state changes", () => {
    it("should create subscription when enabled changes from false to true", () => {
      const subscriptionKey = ["test-key"];
      let enabled = false;

      const { rerender } = renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey,
          subscribeFn: mockSubscribeFn,
          enabled,
        })
      );

      expect(mockSubscribeFn).not.toHaveBeenCalled();

      // Change enabled to true
      enabled = true;
      rerender();

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);
    });

    it("should clean up subscription when enabled changes from true to false", () => {
      const subscriptionKey = ["test-key"];
      let enabled = true;

      const { rerender } = renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey,
          subscribeFn: mockSubscribeFn,
          enabled,
        })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);

      // Change enabled to false
      enabled = false;
      rerender();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it("should not clean up subscription when enabled changes from true to false if other observers exist", () => {
      const subscriptionKey = ["test-key"];
      let enabled = true;

      // First hook (always enabled)
      renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey,
          subscribeFn: mockSubscribeFn,
          enabled: true,
        })
      );

      // Second hook (will change from enabled to disabled)
      const { rerender } = renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey,
          subscribeFn: mockSubscribeFn,
          enabled,
        })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);

      // Change enabled to false for second hook
      enabled = false;
      rerender();

      // Should not clean up because first hook is still observing
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });
  });

  describe("subscription key changes", () => {
    it("should create new subscription when key changes", () => {
      let subscriptionKey = ["key1"];

      const { rerender } = renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);

      // Change subscription key - this should create a new subscription
      subscriptionKey = ["key2"];
      rerender();

      // The new subscription should be created with the same subscribeFn
      // since we're not changing the subscribeFn, just the key
      expect(mockSubscribeFn).toHaveBeenCalledTimes(2);
    });

    it("should clean up old subscription when key changes", () => {
      let subscriptionKey = ["key1"];

      const { rerender } = renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);

      // Change subscription key
      subscriptionKey = ["key2"];
      rerender();

      // Old subscription should be cleaned up
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe("subscribeFn changes", () => {
    it("should reuse existing subscription when subscribeFn changes but key stays same", () => {
      const subscriptionKey = ["test-key"];
      let subscribeFn = mockSubscribeFn;
      const mockUnsubscribe2 = vi.fn();
      const mockSubscribeFn2 = vi.fn(() => mockUnsubscribe2);

      const { rerender } = renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);

      // Change subscribeFn - should reuse existing subscription
      subscribeFn = mockSubscribeFn2;
      rerender();

      // Should not call the new subscribeFn because existing subscription is reused
      expect(mockSubscribeFn2).not.toHaveBeenCalled();
      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("cleanup on unmount", () => {
    it("should clean up subscription when component unmounts", () => {
      const subscriptionKey = ["test-key"];

      const { unmount } = renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it("should not clean up subscription when component unmounts if other observers exist", () => {
      const subscriptionKey = ["test-key"];

      // First hook
      renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey,
          subscribeFn: mockSubscribeFn,
          enabled: true,
        })
      );

      // Second hook
      const { unmount } = renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey,
          subscribeFn: mockSubscribeFn,
          enabled: true,
        })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);

      unmount();

      // Should not clean up because first hook is still observing
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });
  });

  describe("multiple observers", () => {
    it("should handle multiple observers for same subscription", () => {
      const subscriptionKey = ["test-key"];

      renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);
    });

    it("should clean up subscription only when last observer unmounts", () => {
      const subscriptionKey = ["test-key"];

      const { unmount: unmount1 } = renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      const { unmount: unmount2 } = renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      const { unmount: unmount3 } = renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      // Unmount first two - should not clean up
      unmount1();
      unmount2();
      expect(mockUnsubscribe).not.toHaveBeenCalled();

      // Unmount last one - should clean up
      unmount3();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe("clearAllSubscriptions", () => {
    it("should clear all subscriptions and reset observer counts", () => {
      const subscriptionKey1 = ["key1"];
      const subscriptionKey2 = ["key2"];
      const mockUnsubscribe2 = vi.fn();
      const mockSubscribeFn2 = vi.fn(() => mockUnsubscribe2);

      renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey: subscriptionKey1,
          subscribeFn: mockSubscribeFn,
        })
      );

      renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey: subscriptionKey2,
          subscribeFn: mockSubscribeFn2,
        })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);
      expect(mockSubscribeFn2).toHaveBeenCalledTimes(1);

      clearAllSubscriptions();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockUnsubscribe2).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty subscription key", () => {
      const subscriptionKey: unknown[] = [];

      renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);
    });

    it("should handle null/undefined subscription key", () => {
      const subscriptionKey = [null, undefined];

      renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);
    });

    it("should handle complex subscription keys", () => {
      const subscriptionKey = [
        "users",
        { userId: "123", includeDeleted: true },
        ["posts", "comments"],
      ];

      renderHook(() =>
        useReactQuerySubscribe({ subscriptionKey, subscribeFn: mockSubscribeFn })
      );

      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);
    });

    it("should not create subscription when disabled", () => {
      const subscriptionKey = ["test-key"];

      renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey,
          subscribeFn: mockSubscribeFn,
          enabled: false,
        })
      );

      expect(mockSubscribeFn).not.toHaveBeenCalled();
    });
  });

  describe("observer count management", () => {
    it("should correctly track observer count for enabled subscriptions", () => {
      const subscriptionKey = ["test-key"];
      let enabled = true;

      const { rerender } = renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey,
          subscribeFn: mockSubscribeFn,
          enabled,
        })
      );

      // Should have 1 observer
      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);

      // Disable - subscription should be cleaned up
      enabled = false;
      rerender();

      // Re-enable - should create new subscription
      enabled = true;
      rerender();

      expect(mockSubscribeFn).toHaveBeenCalledTimes(2);
    });

    it("should handle rapid enabled/disabled toggles", () => {
      const subscriptionKey = ["test-key"];
      let enabled = true;

      const { rerender } = renderHook(() =>
        useReactQuerySubscribe({
          subscriptionKey,
          subscribeFn: mockSubscribeFn,
          enabled,
        })
      );

      // Rapid toggles
      enabled = false;
      rerender();
      enabled = true;
      rerender();
      enabled = false;
      rerender();
      enabled = true;
      rerender();

      // Should create subscription multiple times due to toggles
      expect(mockSubscribeFn).toHaveBeenCalledTimes(3);
    });
  });
});
