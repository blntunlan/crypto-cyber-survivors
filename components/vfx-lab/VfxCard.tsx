import React, { useCallback, useEffect, useState } from 'react';
import {
  type VfxPreviewModule,
  type VfxStatus,
  type VfxStatusRecord,
} from '../../types/vfxLab';
import { VfxStatusService } from '../../services/system/VfxStatusService';
import { VfxPreviewCanvas } from './VfxPreviewCanvas';

interface Props {
  module: VfxPreviewModule;
}

const STATUS_OPTIONS: ReadonlyArray<{
  value: VfxStatus;
  label: string;
  color: string;
}> = [
  { value: 'draft', label: 'Draft', color: '#64748b' },
  { value: 'review', label: 'Review', color: '#3b82f6' },
  { value: 'approved', label: 'Approved', color: '#10b981' },
  { value: 'in-game', label: 'In Game', color: '#22c55e' },
  { value: 'rejected', label: 'Rejected', color: '#ef4444' },
];

const CANVAS_W = 280;
const CANVAS_H = 220;

export const VfxCard: React.FC<Props> = ({ module }) => {
  const [record, setRecord] = useState<VfxStatusRecord>(() =>
    VfxStatusService.get(module.id)
  );
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    return VfxStatusService.subscribe(() => {
      setRecord(VfxStatusService.get(module.id));
    });
  }, [module.id]);

  const onStatusChange = useCallback(
    (s: VfxStatus) => {
      VfxStatusService.setStatus(module.id, s);
    },
    [module.id]
  );

  const onNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      VfxStatusService.setNotes(module.id, e.target.value);
    },
    [module.id]
  );

  const statusMeta =
    STATUS_OPTIONS.find(s => s.value === record.status) ?? STATUS_OPTIONS[0]!;

  return (
    <div
      style={{
        background: '#111827',
        border: `1px solid ${statusMeta.color}40`,
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: CANVAS_W + 28,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: '#e5e7eb', fontSize: 14 }}>
            {module.label}
          </div>
          <div style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>
            {module.category}
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: statusMeta.color,
            letterSpacing: '0.05em',
          }}
        >
          {statusMeta.label}
        </span>
      </div>

      <VfxPreviewCanvas
        module={module}
        width={CANVAS_W}
        height={CANVAS_H}
        paused={paused}
        resetKey={resetKey}
      />

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setPaused(p => !p)} style={btnStyle} type="button">
          {paused ? '▶ Play' : '⏸ Pause'}
        </button>
        <button onClick={() => setResetKey(k => k + 1)} style={btnStyle} type="button">
          🔄 Reset
        </button>
      </div>

      {module.description && (
        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
          {module.description}
        </div>
      )}

      <select
        value={record.status}
        onChange={e => onStatusChange(e.target.value as VfxStatus)}
        style={{
          background: '#0f172a',
          color: '#e5e7eb',
          border: '1px solid #334155',
          borderRadius: 6,
          padding: '6px 8px',
          fontSize: 12,
        }}
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <textarea
        value={record.notes ?? ''}
        onChange={onNotesChange}
        placeholder="Notes (why approved/rejected, tweaks needed...)"
        rows={2}
        style={{
          background: '#0f172a',
          color: '#e5e7eb',
          border: '1px solid #334155',
          borderRadius: 6,
          padding: '6px 8px',
          fontSize: 11,
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  flex: 1,
  background: '#1e293b',
  color: '#e5e7eb',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '6px 8px',
  fontSize: 12,
  cursor: 'pointer',
};
