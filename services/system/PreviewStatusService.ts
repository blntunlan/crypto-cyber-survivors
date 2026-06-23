import { type PreviewStatusRecord } from '../../types/previewLab';

type PreviewStatus = PreviewStatusRecord['status'];

const STORAGE_KEY = 'preview-lab-status-v1';

type Listener = () => void;

class PreviewStatusServiceImpl {
  private cache: Record<string, PreviewStatusRecord> = {};
  private listeners = new Set<Listener>();
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.cache = JSON.parse(raw) as Record<string, PreviewStatusRecord>;
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

  get(id: string): PreviewStatusRecord {
    this.load();
    return (
      this.cache[id] ?? {
        status: 'draft',
        updatedAt: 0,
      }
    );
  }

  setStatus(id: string, status: PreviewStatus): void {
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

export const PreviewStatusService = new PreviewStatusServiceImpl();
