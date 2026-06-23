import React, { useMemo, useState } from 'react';
import { AUDIO_CATALOG, AUDIO_CATEGORIES } from '../audio/audioCatalog';
import { AudioCard } from '../audio/AudioCard';
import { type AudioPreviewEntry } from '../../../types/previewLab';

type AudioFilter = (typeof AUDIO_CATEGORIES)[number];

export const SoundsTab: React.FC = () => {
  const [filter, setFilter] = useState<AudioFilter>('all');

  const visible = useMemo<ReadonlyArray<AudioPreviewEntry>>(
    () =>
      filter === 'all'
        ? AUDIO_CATALOG
        : AUDIO_CATALOG.filter(e => e.category === filter),
    [filter]
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {AUDIO_CATEGORIES.map(c => (
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(255px, 1fr))',
          gap: 14,
        }}
      >
        {visible.map(entry => (
          <AudioCard key={entry.id} entry={entry} />
        ))}
      </div>
    </>
  );
};
