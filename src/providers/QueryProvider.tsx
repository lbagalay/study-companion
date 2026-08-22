import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';

export function QueryProvider({ cacheKey, children }: PropsWithChildren<{ cacheKey: string }>) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { networkMode: 'offlineFirst', retry: 1, staleTime: 30_000, gcTime: 1000 * 60 * 60 * 24 } } }));
  const [persister] = useState(() => createAsyncStoragePersister({ storage: AsyncStorage, key: cacheKey }));
  return <PersistQueryClientProvider client={client} persistOptions={{ maxAge: 1000 * 60 * 60 * 24, persister }}>{children}</PersistQueryClientProvider>;
}
