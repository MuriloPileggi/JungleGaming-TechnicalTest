import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHistoryQuery, useRankingQuery } from '../api/hooks';
import type { Page } from '../api/types';
import { formatTime } from '../utils/formatTime';
import { headingStyle, linkButtonStyle, panelStyle, screenStyle, titleStyle } from './Styles';

type Tab = 'ranking' | 'history';

export function HistoryScreen() {
  const [tab, setTab] = useState<Tab>('ranking');
  const [page, setPage] = useState(1);

  const switchTab = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  return (
    <div style={screenStyle}>
      <h1 style={titleStyle}>VOYAGES</h1>

      <div role="tablist" aria-label="Voyage records" style={{ display: 'flex', gap: 8 }}>
        <button
          role="tab"
          aria-selected={tab === 'ranking'}
          onClick={() => switchTab('ranking')}
          style={tabStyle(tab === 'ranking')}
        >
          Ranking
        </button>
        <button
          role="tab"
          aria-selected={tab === 'history'}
          onClick={() => switchTab('history')}
          style={tabStyle(tab === 'history')}
        >
          Match History
        </button>
      </div>

      <section style={panelStyle} role="tabpanel" aria-label={tab}>
        {tab === 'ranking' ? (
          <RankingPanel page={page} onPage={setPage} />
        ) : (
          <HistoryPanel page={page} onPage={setPage} />
        )}
      </section>

      <Link to="/" style={linkButtonStyle}>
        Back to menu
      </Link>
    </div>
  );
}

function Pager({
  data,
  page,
  onPage,
}: {
  data: Page<unknown>;
  page: number;
  onPage: (p: number) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
      <button data-testid="prev-page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Prev
      </button>
      <span data-testid="page-indicator">
        Page {data.page ?? 1} / {data.pages ?? 1}
      </span>
      <button
        data-testid="next-page"
        disabled={page >= data.pages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

function RankingPanel({ page, onPage }: { page: number; onPage: (p: number) => void }) {
  const q = useRankingQuery(page);
  if (q.isPending) return <p>Loading ranking…</p>;
  if (q.isError) return <ErrorState onRetry={() => void q.refetch()} />;
  if (!q.data || q.data.items.length === 0)
    return <p data-testid="empty-state">No voyages recorded yet.</p>;
  return (
    <>
      <h2 style={headingStyle}>Top scores</h2>
      <table style={{ margin: '0 auto', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['#', 'Score', 'Kills', 'End'].map((h) => (
              <th key={h} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {q.data.items.map((r) => (
            <tr key={r.rank} data-testid="ranking-row">
              <td style={th}>{r.rank}</td>
              <td style={th}>{r.score}</td>
              <td style={th}>{r.enemiesKilled}</td>
              <td style={th}>{r.endReason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager data={q.data} page={page} onPage={onPage} />
    </>
  );
}

function HistoryPanel({ page, onPage }: { page: number; onPage: (p: number) => void }) {
  const q = useHistoryQuery(page);
  if (q.isPending) return <p>Loading history…</p>;
  if (q.isError) return <ErrorState onRetry={() => void q.refetch()} />;
  if (!q.data || q.data.items.length === 0)
    return <p data-testid="empty-state">No voyages recorded yet.</p>;
  return (
    <>
      <h2 style={headingStyle}>Recent matches</h2>
      {q.data.items.map((e) => (
        <p key={e.id} data-testid="history-row" style={{ margin: 4 }}>
          {new Date(e.endedAt).toLocaleString()} — {e.score} pts · {e.enemiesKilled} kills ·{' '}
          {formatTime(e.durationPlayed)} · {e.endReason}
        </p>
      ))}
      <Pager data={q.data} page={page} onPage={onPage} />
    </>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <p role="alert">
      Unavailable.{' '}
      <button data-testid="retry" onClick={onRetry}>
        Retry
      </button>
    </p>
  );
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 20px',
  fontFamily: 'monospace',
  fontSize: 14,
  cursor: 'pointer',
  background: active ? '#c9a227' : 'transparent',
  color: active ? '#1a1a1a' : '#e8dcc0',
  border: '1px solid rgba(232,220,192,0.4)',
  borderRadius: 4,
});
const th: React.CSSProperties = { padding: '2px 10px' };
