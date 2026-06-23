import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  type AssetPreviewEntry,
  type PreviewStatus,
  type PreviewStatusRecord,
  type PreviewTheme,
} from '../../../types/previewLab';
import { PreviewStatusService } from '../../../services/system/PreviewStatusService';
import { resolveEntryColor } from './assetCatalog';
import { drawEnemy, drawPlayer } from './entityDraw';
import { drawStyledEnemy } from './entityDrawStyled';

interface Props {
  entry: AssetPreviewEntry;
}

const CANVAS_W = 200;
const CANVAS_H = 160;

const STATUS_OPTIONS: ReadonlyArray<{
  value: PreviewStatus;
  label: string;
  color: string;
}> = [
  { value: 'draft', label: 'Draft', color: '#64748b' },
  { value: 'review', label: 'Review', color: '#3b82f6' },
  { value: 'approved', label: 'Approved', color: '#10b981' },
  { value: 'in-game', label: 'In Game', color: '#22c55e' },
  { value: 'rejected', label: 'Rejected', color: '#ef4444' },
];

export const AssetCard: React.FC<Props> = ({ entry }) => {
  const [record, setRecord] = useState<PreviewStatusRecord>(() =>
    PreviewStatusService.get(entry.id)
  );
  const [theme, setTheme] = useState<PreviewTheme>('cyberpunk');
  const [position, setPosition] = useState<'LONG' | 'SHORT'>('LONG');
  const [isElite, setIsElite] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [useStyled, setUseStyled] = useState(true);
  const [whaleTier, setWhaleTier] = useState(2);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    return PreviewStatusService.subscribe(() => {
      setRecord(PreviewStatusService.get(entry.id));
    });
  }, [entry.id]);

  const onStatusChange = useCallback(
    (s: PreviewStatus) => PreviewStatusService.setStatus(entry.id, s),
    [entry.id]
  );
  const onNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      PreviewStatusService.setNotes(entry.id, e.target.value),
    [entry.id]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    phaseRef.current = 0;
    let lastTs = 0;

    const loop = (ts: number): void => {
      const dt = lastTs === 0 ? 0 : Math.min(50, ts - lastTs);
      lastTs = ts;

      if (!paused) {
        phaseRef.current += dt * 0.004;
      }

      ctx.fillStyle = '#0a0f1c';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.strokeStyle = 'rgba(148,163,184,0.08)';
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x <= CANVAS_W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_H);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_H; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
      }

      const cx = CANVAS_W / 2;
      const cy = CANVAS_H / 2;
      const color = resolveEntryColor(entry, position);

      let displayRadius = Math.min(entry.radius, 42);
      if (entry.id === 'enemy-whale') {
        const tierMult = whaleTier === 1 ? 1.3 : whaleTier === 3 ? 2.0 : 1.6;
        displayRadius = Math.min(entry.radius * tierMult * 0.5, 48);
      }

      if (entry.kind === 'player') {
        drawPlayer(ctx, {
          x: cx,
          y: cy,
          radius: displayRadius,
          color,
          theme,
          bobPhase: phaseRef.current,
          hurtFlash: hitFlash,
        });
      } else if (useStyled) {
        const enemyType = entry.id.replace('enemy-', '');
        drawStyledEnemy(ctx, {
          x: cx,
          y: cy,
          radius: displayRadius,
          color,
          theme,
          enemyType,
          isElite: isElite && !entry.isBoss,
          isBoss: entry.isBoss,
          bobPhase: phaseRef.current,
          hitFlash: hitFlash ? 0.8 : 0,
          whaleTier: entry.id === 'enemy-whale' ? whaleTier : undefined,
        });
      } else {
        drawEnemy(ctx, {
          x: cx,
          y: cy,
          radius: displayRadius,
          color,
          theme,
          isElite: isElite && !entry.isBoss,
          isBoss: entry.isBoss,
          bobPhase: phaseRef.current,
          hitFlash: hitFlash ? 0.8 : 0,
        });
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [
    entry,
    theme,
    position,
    isElite,
    hitFlash,
    paused,
    resetKey,
    useStyled,
    whaleTier,
  ]);

  const statusMeta =
    STATUS_OPTIONS.find(s => s.value === record.status) ?? STATUS_OPTIONS[0]!;

  const canFlipColor = entry.kind === 'player' || entry.isOppositeColor === true;
  const canElite = entry.kind === 'enemy' && !entry.isBoss;

  return (
    <div
      style={{
        background: '#111827',
        border: `1px solid ${statusMeta.color}40`,
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: CANVAS_W + 24,
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
          <div style={{ fontWeight: 700, color: '#e5e7eb', fontSize: 13 }}>
            {entry.label}
            {entry.isBoss && (
              <span style={{ color: '#FFD700', fontSize: 10, marginLeft: 4 }}>
                BOSS
              </span>
            )}
          </div>
          <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>
            {entry.category}
          </div>
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: statusMeta.color,
            letterSpacing: '0.05em',
          }}
        >
          {statusMeta.label}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          display: 'block',
          width: `${CANVAS_W}px`,
          height: `${CANVAS_H}px`,
          borderRadius: 6,
        }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {entry.kind === 'enemy' && (
          <button
            onClick={() => setUseStyled(v => !v)}
            style={{
              ...btnStyle,
              color: useStyled ? '#a855f7' : '#94a3b8',
              fontWeight: useStyled ? 700 : 400,
            }}
            type="button"
          >
            {useStyled ? 'STYLED' : 'CLASSIC'}
          </button>
        )}
        {entry.id === 'enemy-whale' && useStyled && (
          <div style={{ display: 'flex', gap: 2 }}>
            {[
              { t: 1, label: 'BABY' },
              { t: 2, label: 'WHALE' },
              { t: 3, label: 'MEGA' },
            ].map(({ t, label }) => (
              <button
                key={t}
                onClick={() => setWhaleTier(t)}
                style={{
                  ...btnStyle,
                  padding: '4px 5px',
                  fontSize: 9,
                  color: whaleTier === t ? '#B026FF' : '#64748b',
                  fontWeight: whaleTier === t ? 700 : 400,
                  background: whaleTier === t ? '#1e1b4b' : '#1e293b',
                  borderColor: whaleTier === t ? '#B026FF' : '#334155',
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() =>
            setTheme(t => (t === 'cyberpunk' ? 'retro-16bit' : 'cyberpunk'))
          }
          style={btnStyle}
          type="button"
        >
          {theme === 'cyberpunk' ? 'CYBER' : 'RETRO'}
        </button>
        {canFlipColor && (
          <button
            onClick={() => setPosition(p => (p === 'LONG' ? 'SHORT' : 'LONG'))}
            style={{
              ...btnStyle,
              color: position === 'LONG' ? '#22c55e' : '#ef4444',
            }}
            type="button"
          >
            {position}
          </button>
        )}
        {canElite && (
          <button
            onClick={() => setIsElite(v => !v)}
            style={{
              ...btnStyle,
              color: isElite ? '#FFD700' : '#94a3b8',
            }}
            type="button"
          >
            {isElite ? 'ELITE' : 'norm'}
          </button>
        )}
        <button
          onClick={() => {
            setHitFlash(true);
            window.setTimeout(() => setHitFlash(false), 180);
          }}
          style={btnStyle}
          type="button"
        >
          HIT
        </button>
        <button onClick={() => setPaused(p => !p)} style={btnStyle} type="button">
          {paused ? 'PLAY' : 'PAUSE'}
        </button>
        <button onClick={() => setResetKey(k => k + 1)} style={btnStyle} type="button">
          RESET
        </button>
      </div>

      {entry.stats && (
        <div
          style={{
            fontSize: 10,
            color: '#94a3b8',
            lineHeight: 1.5,
            background: '#0f172a',
            padding: '4px 6px',
            borderRadius: 4,
          }}
        >
          {entry.stats.baseHealth !== undefined && (
            <span>HP {entry.stats.baseHealth} </span>
          )}
          {entry.stats.baseSpeed !== undefined && (
            <span>SPD {entry.stats.baseSpeed} </span>
          )}
          {entry.stats.baseDamage !== undefined && (
            <span>DMG {entry.stats.baseDamage} </span>
          )}
          {entry.stats.spawnWeight !== undefined && (
            <span>W {entry.stats.spawnWeight}</span>
          )}
          {entry.stats.combatRole && <span> [{entry.stats.combatRole}]</span>}
        </div>
      )}

      {entry.description && (
        <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
          {entry.description}
        </div>
      )}

      <select
        value={record.status}
        onChange={e => onStatusChange(e.target.value as PreviewStatus)}
        style={selectStyle}
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
        placeholder="Notes..."
        rows={2}
        style={textareaStyle}
      />
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  background: '#1e293b',
  color: '#e5e7eb',
  border: '1px solid #334155',
  borderRadius: 4,
  padding: '4px 6px',
  fontSize: 10,
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  background: '#0f172a',
  color: '#e5e7eb',
  border: '1px solid #334155',
  borderRadius: 4,
  padding: '4px 6px',
  fontSize: 11,
};

const textareaStyle: React.CSSProperties = {
  background: '#0f172a',
  color: '#e5e7eb',
  border: '1px solid #334155',
  borderRadius: 4,
  padding: '4px 6px',
  fontSize: 10,
  resize: 'vertical',
  fontFamily: 'inherit',
};
