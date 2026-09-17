import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHistory, fetchRanking, submitMatch } from './client';
import { removePending } from './pendingQueue';

export function useHistoryQuery(page: number) {
  return useQuery({ queryKey: ['history', page], queryFn: () => fetchHistory(page) });
}
export function useRankingQuery(page: number) {
  return useQuery({ queryKey: ['ranking', page], queryFn: () => fetchRanking(page) });
}
export function useSubmitMatchMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitMatch,
    onSuccess: (entry) => {
      removePending(entry.clientId);
      void qc.invalidateQueries({ queryKey: ['history'] });
      void qc.invalidateQueries({ queryKey: ['ranking'] });
    },
    onError: (err) => console.warn('[api] match submit failed (queued for retry):', err),
  });
}
