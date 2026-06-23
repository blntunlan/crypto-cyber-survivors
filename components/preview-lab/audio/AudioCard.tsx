import React, { useCallback, useEffect, useState } from 'react';
import {
  type AudioPreviewEntry,
  type PreviewStatus,
  type PreviewStatusRecord,
  type PreviewTheme,
} from '../../../types/previewLab';
import { PreviewStatusService } from '../../../services/system/PreviewStatusService';
import { audio, synthEngine } from '../../../services/audio';
import { getPreset } from '../../../config/AudioRegistry';
import { ThemeService } from '../../../services/system/ThemeService';

interface Props {
  entry: AudioPreviewEntry;
}

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

function applyThemeForPlayback(theme: PreviewTheme): void {
  if (ThemeService.getTheme() !== theme) {
    ThemeService.setTheme(theme);
  }
}

function playPreset(
  presetId: string,
  opts: { volume: number; pitch: number; duration: number }
): void {
  const preset = getPreset(presetId);
  if (!preset) return;
  synthEngine.playPreset(preset, {
    volumeMultiplier: opts.volume,
    frequencyMultiplier: opts.pitch,
    durationMultiplier: opts.duration,
  });
}

function playComposite(
  compositeId: NonNullable<AudioPreviewEntry['compositeId']>
): void {
  switch (compositeId) {
    case 'playLevelUp':
      audio.playLevelUp();
      return;
    case 'playDeath':
      audio.playDeath();
      return;
    case 'playJackpot':
      audio.playJackpot();
      return;
    case 'playCombo':
      audio.playCombo(2);
      return;
    case 'playCoinShower':
      audio.playCoinShower();
      return;
    case 'playAnticipation':
      audio.playAnticipation(1);
      return;
    case 'playMultiplierChime':
      audio.playMultiplierChime(2);
      return;
    case 'playSlowdownTension':
      audio.playSlowdownTension();
      return;
    case 'playSpinStart':
      audio.playSpinStart();
      return;
    case 'playSlotWin':
      audio.playSlotWin();
      return;
    case 'playWeaponFire':
      audio.playWeaponFire('quantum_bullet', 1);
      return;
    case 'playComboMilestone1':
      audio.playComboMilestone('combo1');
      return;
    case 'playComboMilestone5':
      audio.playComboMilestone('combo5');
      return;
  }
}

export const AudioCard: React.FC<Props> = ({ entry }) => {
  const [record, setRecord] = useState<PreviewStatusRecord>(() =>
    PreviewStatusService.get(entry.id)
  );
  const [theme, setTheme] = useState<PreviewTheme>('cyberpunk');
  const [volume, setVolume] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [duration, setDuration] = useState(1);
  const [bypassCooldown, setBypassCooldown] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const onPlay = useCallback(() => {
    applyThemeForPlayback(theme);
    if (bypassCooldown) synthEngine.resetForTesting();
    if (entry.kind === 'preset' && entry.presetId) {
      playPreset(entry.presetId, { volume, pitch, duration });
    } else if (entry.kind === 'composite' && entry.compositeId) {
      playComposite(entry.compositeId);
    }
    setIsPlaying(true);
    window.setTimeout(() => setIsPlaying(false), 400);
  }, [entry, theme, bypassCooldown, volume, pitch, duration]);

  const statusMeta =
    STATUS_OPTIONS.find(s => s.value === record.status) ?? STATUS_OPTIONS[0]!;

  const isPreset = entry.kind === 'preset';

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
        width: 240,
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
          </div>
          <div
            style={{
              color: '#64748b',
              fontSize: 10,
              textTransform: 'uppercase',
            }}
          >
            {entry.category} · {entry.kind}
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

      <button
        onClick={onPlay}
        style={{
          background: isPlaying ? '#1e293b' : '#0f172a',
          color: isPlaying ? '#22d3ee' : '#e5e7eb',
          border: '1px solid #334155',
          borderRadius: 6,
          padding: '10px 8px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.05em',
        }}
        type="button"
      >
        {isPlaying ? '▶ PLAYING...' : '▶ PLAY'}
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <button
          onClick={() =>
            setTheme(t => (t === 'cyberpunk' ? 'retro-16bit' : 'cyberpunk'))
          }
          style={{
            ...btnStyle,
            color: theme === 'cyberpunk' ? '#22d3ee' : '#f59e0b',
          }}
          type="button"
          disabled={!entry.hasRetroVariant}
        >
          {theme === 'cyberpunk' ? 'CYBER' : 'RETRO'}
        </button>
        <button
          onClick={() => setBypassCooldown(v => !v)}
          style={{
            ...btnStyle,
            color: bypassCooldown ? '#22c55e' : '#94a3b8',
          }}
          type="button"
        >
          CD {bypassCooldown ? 'OFF' : 'ON'}
        </button>
      </div>

      {isPreset && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>
            VOL {Math.round(volume * 100)}%
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              style={rangeStyle}
            />
          </label>
          <label style={labelStyle}>
            PITCH {pitch.toFixed(2)}x
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={pitch}
              onChange={e => setPitch(parseFloat(e.target.value))}
              style={rangeStyle}
            />
          </label>
          <label style={labelStyle}>
            DUR {duration.toFixed(2)}x
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={duration}
              onChange={e => setDuration(parseFloat(e.target.value))}
              style={rangeStyle}
            />
          </label>
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

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: 10,
  color: '#94a3b8',
  gap: 2,
};

const rangeStyle: React.CSSProperties = {
  width: '100%',
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
