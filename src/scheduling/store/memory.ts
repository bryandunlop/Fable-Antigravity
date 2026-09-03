import type { ChecklistTemplate, TaskInstance } from '../engine';
import type { SchedulingStore, TripRecord, SchedulingEvent, EventTarget } from './types';

export class InMemorySchedulingStore implements SchedulingStore {
  private templates = new Map<string, ChecklistTemplate>(); // key `${id}:${version}`
  private trips = new Map<string, TripRecord>();
  private instances = new Map<string, TaskInstance>();
  private events = new Map<string, SchedulingEvent>();
  private pilotVisible = new Set<string>();

  async saveTemplate(t: ChecklistTemplate): Promise<ChecklistTemplate> {
    this.templates.set(`${t.id}:${t.version}`, structuredClone(t));
    return t;
  }
  private latestPublished(id: string): ChecklistTemplate | null {
    let best: ChecklistTemplate | null = null;
    for (const t of this.templates.values()) {
      if (t.id === id && t.status === 'published' && (!best || t.version > best.version)) best = t;
    }
    return best ? structuredClone(best) : null;
  }
  async getTemplate(id: string, version?: number): Promise<ChecklistTemplate | null> {
    if (version === undefined) return this.latestPublished(id);
    const t = this.templates.get(`${id}:${version}`);
    return t ? structuredClone(t) : null;
  }
  async listPublishedTemplates(): Promise<ChecklistTemplate[]> {
    const ids = new Set([...this.templates.values()].map((t) => t.id));
    return [...ids].map((id) => this.latestPublished(id)).filter((t): t is ChecklistTemplate => t !== null);
  }

  async saveTrip(t: TripRecord): Promise<TripRecord> { this.trips.set(t.id, structuredClone(t)); return t; }
  async getTrip(id: string): Promise<TripRecord | null> { const t = this.trips.get(id); return t ? structuredClone(t) : null; }
  async listTrips(): Promise<TripRecord[]> { return [...this.trips.values()].map((t) => structuredClone(t)); }

  async saveInstances(xs: TaskInstance[]): Promise<void> { for (const x of xs) this.instances.set(x.id, structuredClone(x)); }
  async getInstance(id: string): Promise<TaskInstance | null> { const x = this.instances.get(id); return x ? structuredClone(x) : null; }
  async updateInstance(x: TaskInstance): Promise<void> { this.instances.set(x.id, structuredClone(x)); }
  async removeInstances(ids: string[]): Promise<void> { for (const id of ids) this.instances.delete(id); }
  async listInstancesForTrip(tripId: string): Promise<TaskInstance[]> {
    return [...this.instances.values()].filter((x) => x.tripId === tripId).map((x) => structuredClone(x));
  }
  async listRecurringInstances(runDate: string): Promise<TaskInstance[]> {
    return [...this.instances.values()].filter((x) => x.tripId === null && x.runDate === runDate).map((x) => structuredClone(x));
  }

  async saveEvent(e: SchedulingEvent): Promise<SchedulingEvent> { this.events.set(e.id, structuredClone(e)); return e; }
  async getEvent(id: string): Promise<SchedulingEvent | null> { const e = this.events.get(id); return e ? structuredClone(e) : null; }
  async updateEvent(e: SchedulingEvent): Promise<void> { this.events.set(e.id, structuredClone(e)); }
  async listEventsForTarget(target: EventTarget): Promise<SchedulingEvent[]> {
    return [...this.events.values()]
      .filter((e) => e.target.kind === target.kind && e.target.value === target.value)
      .map((e) => structuredClone(e));
  }
  async removeEvent(id: string): Promise<void> { this.events.delete(id); }

  async getPilotVisibility(): Promise<string[]> { return [...this.pilotVisible]; }
  async setPilotVisible(taskDefId: string, visible: boolean): Promise<void> {
    if (visible) this.pilotVisible.add(taskDefId); else this.pilotVisible.delete(taskDefId);
  }
}
