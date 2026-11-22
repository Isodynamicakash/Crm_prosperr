import { useEffect, useState } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Wraps a write call: shows a success toast, shows the server's own message on failure,
 * and refreshes the lists that depend on the change.
 */
export function useAction<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, opts: {
  success?: string | ((r: TResult) => string | null);
  invalidate?: QueryKey[];
  onSuccess?: (r: TResult, args: TArgs) => void;
} = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r, args) => {
      const msg = typeof opts.success === 'function' ? opts.success(r) : opts.success;
      if (msg) toast.success(msg);
      (opts.invalidate ?? []).forEach((k) => qc.invalidateQueries({ queryKey: k }));
      opts.onSuccess?.(r, args);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
