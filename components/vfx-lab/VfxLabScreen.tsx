/**
 * VfxLabScreen — Dev-only overlay showcasing all registered VFX modules.
 *
 * Opened via Ctrl+Shift+V. Each module runs in its own canvas. Status and
 * notes are persisted to localStorage via VfxStatusService.
 */

import React, { useMemo, useState } from 'react';
import { VFX_CATALOG } from './vfxCatalog';
import { VfxCard } from './VfxCard';
import { type VfxCategory } from '../../types/vfxLab';

interface Props {
  onClose: () => void;
}

const CATEGORIES: ReadonlyArray<VfxCategory | 'all'> = [
  'all',
  'weapon',
  'skill',
  'impact',
  'particle',
  'hud',
  'other',
];

export const VfxLabScreen: React.FC<Props> = ({ onClose }) => {
  const [filter, setFilter] = useState<VfxCategory | 'all'>('all');

  const visible = useMemo(
    () =>
      filter === 'all' ? VFX_CATALOG : VFX_CATALOG.filter(m => m.category === filter),
    [filter]
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2,6,23,0.96)',
        zIndex: 9999,
        overflowY: 'auto',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              color: '#f1f5f9',
              fontSize: 22,
              margin: 0,
              letterSpacing: '0.05em',
            }}
          >
            VFX PREVIEW LAB
          </h1>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            {VFX_CATALOG.length} effect{VFX_CATALOG.length === 1 ? '' : 's'} registered
            · Ctrl+Shift+V to toggle
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#1e293b',
            color: '#e5e7eb',
            border: '1px solid #334155',
            borderRadius: 6,
            padding: '8px 14px',
            fontSize: 13,
            cursor: 'pointer',
          }}
          type="button"
        >
          Close (Esc)
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{
              background: filter === c ? '#334155' : '#0f172a',
              color: filter === c ? '#f1f5f9' : '#94a3b8',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
            type="button"
          >
            {c}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div
          style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: 48 }}
        >
          No effects in this category yet.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: 16,
          }}
        >
          {visible.map(mod => (
            <VfxCard key={mod.id} module={mod} />
          ))}
        </div>
      )}
    </div>
  );
};
