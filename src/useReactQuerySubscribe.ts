import { useEffect, useRef } from "react";
import { hashKey, type QueryKey } from "@tanstack/react-query";

const unsubscribes: Record<string, () => void> = {};
const observerCount: Record<string, number> = {};
type Unsubscribe = () => void;

export type SubscriptionCallback<TData> = (data: TData | null) => void;

// Clear all subscriptions - useful for cleanup on signout
export function clearAllSubscriptions() {
  Object.keys(unsubscribes).forEach((key) => {
    const unsubscribe = unsubscribes[key];
    if (unsubscribe) {
      unsubscribe();
      delete unsubscribes[key];
    }
  });

  // Reset observer counts
  Object.keys(observerCount).forEach((key) => {
    delete observerCount[key];
  });
}

export function useReactQuerySubscribe({
  subscriptionKey,
  subscribeFn,
  enabled = true,
}: {
  subscriptionKey: QueryKey;
  subscribeFn: () => Unsubscribe;
  enabled?: boolean;
}) {
  const subscriptionHash = hashKey(subscriptionKey);
  observerCount[subscriptionHash] ??= 0;

  const cleanupSubscription = (subscriptionHash: string) => {
    if (observerCount[subscriptionHash] === 0) {
      const unsubscribe = unsubscribes[subscriptionHash];

      if (!unsubscribe) {
        return;
      }

      unsubscribe?.();
      delete unsubscribes[subscriptionHash];
    }
  };

  useEffect(() => {
    if (enabled) {
      observerCount[subscriptionHash] += 1;
    }

    return () => {
      if (enabled) {
        observerCount[subscriptionHash] -= 1;
        cleanupSubscription(subscriptionHash);
      }
    };
  }, [subscriptionHash, enabled]);

  const unsubscribe = useRef<Unsubscribe | undefined>(undefined);

  useEffect(() => {
    // Clean up previous subscription if subscription key changes
    const previousUnsubscribe = unsubscribe.current;

    if (enabled) {
      if (unsubscribes[subscriptionHash]) {
        unsubscribe.current = unsubscribes[subscriptionHash];
      } else {
        unsubscribe.current = subscribeFn();
        unsubscribes[subscriptionHash] = unsubscribe.current;
      }
    } else {
      // If disabled, clean up any existing subscription
      unsubscribe.current = undefined;
      if (
        unsubscribes[subscriptionHash] &&
        observerCount[subscriptionHash] === 0
      ) {
        unsubscribes[subscriptionHash]();
        delete unsubscribes[subscriptionHash];
      }
    }

    // If subscription key changed and we had a previous subscription, clean it up
    return () => {
      if (previousUnsubscribe && previousUnsubscribe !== unsubscribe.current) {
        // Subscription key changed, need to clean up the old one
        const oldHash = Object.keys(unsubscribes).find(
          (key) => unsubscribes[key] === previousUnsubscribe,
        );
        if (oldHash && observerCount[oldHash] === 0) {
          previousUnsubscribe();
          delete unsubscribes[oldHash];
        }
      }
    };
  }, [subscriptionHash, subscribeFn, enabled]);
}
