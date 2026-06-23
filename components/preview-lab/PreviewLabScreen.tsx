import React, { useState } from 'react';
import { type PreviewTabId } from '../../types/previewLab';
import { VFX_CATALOG } from '../vfx-lab/vfxCatalog';
import { ASSET_CATALOG } from './asset/assetCatalog';
import { AUDIO_CATALOG } from './audio/audioCatalog';
import { VfxTab } from './tabs/VfxTab';
import { AssetsTab } from './tabs/AssetsTab';
import { SoundsTab } from './tabs/SoundsTab';

interface Props {
  onClose: () => void;
}

const TABS: ReadonlyArray<{ id: PreviewTabId; label: string }> = [
  { id: 'vfx', label: 'VFX' },
  { id: 'assets', label: 'Assets' },
  { id: 'sounds', label: 'Sounds' },
];

function tabCount(id: PreviewTabId): number {
  switch (id) {
    case 'vfx':
      return VFX_CATALOG.length;
    case 'assets':
      return ASSET_CATALOG.length;
    case 'sounds':
      return AUDIO_CATALOG.length;
  }
}

export const PreviewLabScreen: React.FC<Props> = ({ onClose }) => {
  const [tab, setTab] = useState<PreviewTabId>('vfx');

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
          marginBottom: 16,
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
            PREVIEW LAB
          </h1>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            Ctrl+Shift+V to toggle · Esc to close
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

      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          borderBottom: '1px solid #1e293b',
          paddingBottom: 12,
        }}
      >
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: active ? '#334155' : 'transparent',
                color: active ? '#f1f5f9' : '#94a3b8',
                border: 'none',
                borderBottom: active ? '2px solid #22d3ee' : '2px solid transparent',
                borderRadius: '6px 6px 0 0',
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.03em',
              }}
              type="button"
            >
              {t.label.toUpperCase()}{' '}
              <span style={{ opacity: 0.6, fontSize: 11 }}>{tabCount(t.id)}</span>
            </button>
          );
        })}
      </div>

      {tab === 'vfx' && <VfxTab />}
      {tab === 'assets' && <AssetsTab />}
      {tab === 'sounds' && <SoundsTab />}
    </div>
  );
};
