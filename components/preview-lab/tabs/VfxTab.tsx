import React, { useMemo, useState } from 'react';
import { VFX_CATALOG } from '../../vfx-lab/vfxCatalog';
import { VfxCard } from '../../vfx-lab/VfxCard';
import { type VfxCategory } from '../../../types/vfxLab';

const CATEGORIES: ReadonlyArray<VfxCategory | 'all'> = [
  'all',
  'weapon',
  'skill',
  'impact',
  'particle',
  'hud',
  'other',
];

export const VfxTab: React.FC = () => {
  const [filter, setFilter] = useState<VfxCategory | 'all'>('all');

  const visible = useMemo(
    () =>
      filter === 'all' ? VFX_CATALOG : VFX_CATALOG.filter(m => m.category === filter),
    [filter]
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
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
    </>
  );
};
