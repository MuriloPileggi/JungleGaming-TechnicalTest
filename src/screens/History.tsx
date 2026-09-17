import { Link } from 'react-router-dom';
import { useHistoryQuery, useRankingQuery } from '../api/hooks';
import { formatTime } from '../utils/formatTime';
import { headingStyle, linkButtonStyle, panelStyle, screenStyle, titleStyle } from './Styles';

export function HistoryScreen() {
  const history = useHistoryQuery();
  const ranking = useRankingQuery();

  return (
    <div style={screenStyle}>
      <h1 style={titleStyle}>VOYAGES</h1>

      <section style={panelStyle} aria-label="Ranking">
        <h2 style={headingStyle}>Top scores</h2>
        {ranking.isPending && <p>Loading ranking…</p>}
        {ranking.isError && (
          <p role="alert">
            Ranking unavailable. <button onClick={() => void ranking.refetch()}>Retry</button>
          </p>
        )}
        {ranking.data?.length === 0 && <p>No voyages recorded yet.</p>}
        {ranking.data && ranking.data.length > 0 && (
          <table style={{ margin: '0 auto', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Score', 'Kills', 'End'].map((h) => (
                  <th key={h} style={{ padding: '2px 10px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.data.map((r) => (
                <tr key={r.rank}>
                  <td style={{ padding: '2px 10px' }}>{r.rank}</td>
                  <td style={{ padding: '2px 10px' }}>{r.score}</td>
                  <td style={{ padding: '2px 10px' }}>{r.enemiesKilled}</td>
                  <td style={{ padding: '2px 10px' }}>{r.endReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={panelStyle} aria-label="Match history">
        <h2 style={headingStyle}>Recent matches</h2>
        {history.isPending && <p>Loading history…</p>}
        {history.isError && (
          <p role="alert">
            History unavailable. <button onClick={() => void history.refetch()}>Retry</button>
          </p>
        )}
        {history.data?.map((e) => (
          <p key={e.id} style={{ margin: 4 }}>
            {new Date(e.endedAt).toLocaleString()} — {e.score} pts · {e.enemiesKilled} kills ·{' '}
            {formatTime(e.durationPlayed)} · {e.endReason}
          </p>
        ))}
      </section>

      <Link to="/" style={linkButtonStyle}>
        Back to menu
      </Link>
    </div>
  );
}
