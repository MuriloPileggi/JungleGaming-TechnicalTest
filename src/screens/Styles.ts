import type { CSSProperties } from 'react';

export const screenStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  background: '#04141f',
  color: '#e8dcc0',
  fontFamily: 'monospace',
  padding: 24,
};
export const titleStyle: CSSProperties = { fontSize: 48, letterSpacing: 6, margin: 0 };
export const headingStyle: CSSProperties = { fontSize: 18, margin: '0 0 8px' };
export const subtitleStyle: CSSProperties = { opacity: 0.8, margin: 0 };
export const panelStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(232,220,192,0.25)',
  borderRadius: 6,
  padding: '12px 20px',
  textAlign: 'center',
};
export const menuStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  marginTop: 8,
};
export const primaryButtonStyle: CSSProperties = {
  padding: '12px 40px',
  fontSize: 18,
  background: '#c9a227',
  color: '#1a1a1a',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'monospace',
};
export const linkButtonStyle: CSSProperties = {
  padding: '12px 40px',
  fontSize: 16,
  color: '#e8dcc0',
  textAlign: 'center',
  border: '1px solid rgba(232,220,192,0.4)',
  borderRadius: 4,
  textDecoration: 'none',
};
export const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 14,
};
export const hintStyle: CSSProperties = { opacity: 0.6, fontSize: 13 };
export const quitStyle: CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 16,
  zIndex: 30,
  padding: '6px 14px',
  background: 'rgba(4, 20, 34, 0.8)',
  color: '#e8dcc0',
  border: '1px solid rgba(232,220,192,0.4)',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'monospace',
};
