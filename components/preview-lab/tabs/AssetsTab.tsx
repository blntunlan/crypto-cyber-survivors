import React, { useMemo, useState } from 'react';
import { ASSET_CATALOG, ASSET_CATEGORIES } from '../asset/assetCatalog';
import { AssetCard } from '../asset/AssetCard';
import { type AssetPreviewEntry } from '../../../types/previewLab';

type AssetFilter = (typeof ASSET_CATEGORIES)[number];

export const AssetsTab: React.FC = () => {
  const [filter, setFilter] = useState<AssetFilter>('all');

  const visible = useMemo<ReadonlyArray<AssetPreviewEntry>>(
    () =>
      filter === 'all'
        ? ASSET_CATALOG
        : ASSET_CATALOG.filter(e => e.category === filter),
    [filter]
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {ASSET_CATEGORIES.map(c => (
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 14,
        }}
      >
        {visible.map(entry => (
          <AssetCard key={entry.id} entry={entry} />
        ))}
      </div>
    </>
  );
};
