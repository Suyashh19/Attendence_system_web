import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      // One retry: the request timeout already covers a server waking up
      retry: 1,
    },
  },
});
