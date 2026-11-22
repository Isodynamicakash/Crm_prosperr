import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { City, PicklistItem, UserView } from './types';

const DAY = 24 * 60 * 60 * 1000;

/** Reference lists change rarely, so they stay cached for the session. */
export function usePicklist(key: string) {
  return useQuery({
    queryKey: ['picklist', key],
    queryFn: () => api.get<PicklistItem[]>(`/api/config/picklists/${key}`),
    staleTime: DAY,
    select: (d) => d.filter((x) => x.active),
  });
}

export function useCities() {
  return useQuery({ queryKey: ['cities'], queryFn: () => api.get<City[]>('/api/config/cities'), staleTime: DAY });
}

/** Team list (managers and admins only on the backend). */
export function useUsers(enabled = true) {
  return useQuery({ queryKey: ['users'], queryFn: () => api.get<UserView[]>('/api/admin/users'), enabled, staleTime: 60_000 });
}
