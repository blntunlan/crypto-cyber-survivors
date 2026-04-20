/**
 * VfxStatusService — localStorage-backed status store for VFX Lab entries.
 * Dev-only utility. Each VFX module has a status (draft/approved/in-game/...)
 * plus free-form notes. Changes emit a simple pub/sub for React updates.
 */

import { type VfxStatus, type VfxStatusRecord } from '../../types/vfxLab';

const STORAGE_KEY = 'vfx-lab-status-v1';

type Listener = () => void;

class VfxStatusServiceImpl {
  private cache: Record<string, VfxStatusRecord> = {};
  private listeners = new Set<Listener>();
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.cache = JSON.parse(raw) as Record<string, VfxStatusRecord>;
      }
    } catch {
      this.cache = {};
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch {
      // ignore quota errors; lab is dev-only
    }
  }

  get(id: string): VfxStatusRecord {
    this.load();
    return (
      this.cache[id] ?? {
        status: 'draft',
        updatedAt: 0,
      }
    );
  }

  setStatus(id: string, status: VfxStatus): void {
    this.load();
    const prev = this.cache[id] ?? { status: 'draft', updatedAt: 0 };
    this.cache[id] = { ...prev, status, updatedAt: Date.now() };
    this.persist();
    this.emit();
  }

  setNotes(id: string, notes: string): void {
    this.load();
    const prev = this.cache[id] ?? { status: 'draft', updatedAt: 0 };
    this.cache[id] = { ...prev, notes, updatedAt: Date.now() };
    this.persist();
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}

export const VfxStatusService = new VfxStatusServiceImpl();
