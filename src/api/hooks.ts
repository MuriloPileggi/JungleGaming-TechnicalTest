import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHistory, fetchRanking, submitMatch } from './client';

export function useHistoryQuery() {
  return useQuery({ queryKey: ['history'], queryFn: fetchHistory });
}

export function useRankingQuery() {
  return useQuery({ queryKey: ['ranking'], queryFn: fetchRanking });
}

export function useSubmitMatchMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitMatch,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['history'] });
      void qc.invalidateQueries({ queryKey: ['ranking'] });
    },
    onError: (err) => console.warn('[api] match submit failed:', err),
  });
}
