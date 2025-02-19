# use-react-query-subscribe

A lightweight React hook that bridges the gap between TanStack Query (React Query) and real-time subscriptions, enabling seamless integration with Firebase, Supabase, WebSockets, and other subscription-based data sources.

## Motivation

TanStack Query is excellent for managing server state with queries and mutations, but it lacks built-in support for real-time subscriptions. When working with Firebase Firestore listeners, Supabase realtime channels, or WebSocket connections, you need a way to:

- Keep React Query's cache synchronized with real-time updates
- Manage subscription lifecycles efficiently
- Share subscriptions across multiple components
- Prevent memory leaks from abandoned subscriptions

## Installation

```bash
npm install use-react-query-subscribe
```

## Usage

### Basic Example with Firebase Firestore

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReactQuerySubscribe } from 'use-react-query-subscribe';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

function useMessages(channelId: string | undefined) {
  const queryClient = useQueryClient();
  const messagesKey = ['messages', channelId];

  // Set up the subscription
  useReactQuerySubscribe({
    subscriptionKey: messagesKey,
    subscribeFn: () => {
      if (!channelId) {
        return () => {}; // Return empty cleanup function
      }

      const q = query(
        collection(db, 'messages'),
        where('channelId', '==', channelId)
      );

      return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Update React Query cache
        queryClient.setQueryData(messagesKey, messages);
      });
    },
    enabled: !!channelId,
  });

  // Use regular React Query for the data
  return useQuery({
    queryKey: messagesKey,
    queryFn: async () => {
      // Initial data fetch
      const q = query(
        collection(db, 'messages'),
        where('channelId', '==', channelId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!channelId,
  });
}
```

### Example with Supabase Realtime

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReactQuerySubscribe } from 'use-react-query-subscribe';
import { supabase } from './supabase';

function useTodos(userId: string | undefined) {
  const queryClient = useQueryClient();
  const todosKey = ['todos', userId];

  useReactQuerySubscribe({
    subscriptionKey: todosKey,
    subscribeFn: () => {
      if (!userId) {
        return () => {};
      }

      const channel = supabase
        .channel('todos-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'todos',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            // Refetch or update cache when changes occur
            queryClient.invalidateQueries({ queryKey: todosKey });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    enabled: !!userId,
  });

  return useQuery({
    queryKey: todosKey,
    queryFn: async () => {
      const { data } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId);
      return data;
    },
    enabled: !!userId,
  });
}
```

### Example with WebSocket

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReactQuerySubscribe } from 'use-react-query-subscribe';

function useStockPrice(symbol: string | undefined) {
  const queryClient = useQueryClient();
  const priceKey = ['stock-price', symbol];

  useReactQuerySubscribe({
    subscriptionKey: priceKey,
    subscribeFn: () => {
      if (!symbol) {
        return () => {};
      }

      const ws = new WebSocket(`wss://api.example.com/stocks/${symbol}`);

      ws.onmessage = (event) => {
        const price = JSON.parse(event.data);
        queryClient.setQueryData(priceKey, price);
      };

      return () => {
        ws.close();
      };
    },
    enabled: !!symbol,
  });

  return useQuery({
    queryKey: priceKey,
    queryFn: async () => {
      const response = await fetch(`/api/stocks/${symbol}`);
      return response.json();
    },
    enabled: !!symbol,
  });
}
```

## API

### `useReactQuerySubscribe(options)`

#### Options

- **`subscriptionKey`** (required): `QueryKey` - A unique identifier for the subscription, following React Query's key format. Can be a string or array.

- **`subscribeFn`** (required): `() => () => void` - A function that sets up the subscription and returns an unsubscribe function.

- **`enabled`** (optional): `boolean` - Default: `true`. Whether the subscription is active. Useful for conditional subscriptions.

### `clearAllSubscriptions()`

A utility function to manually clear all active subscriptions. Useful for cleanup on user logout or app unmount.

```tsx
import { clearAllSubscriptions } from 'use-react-query-subscribe';

function logout() {
  clearAllSubscriptions();
  // ... rest of logout logic
}
```

## License

ISC

