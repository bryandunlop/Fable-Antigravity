import { useEffect, useState } from 'react';
import { useSchedulingWorkspace } from './SchedulingWorkspaceContext';
import { perTripTaskDefs, type PilotTaskDef } from '../../scheduling/engine';
import { Switch } from '../ui/switch';

/**
 * Scheduler/admin control over which completed trip-prep checklist items pilots can see.
 * Writes the store's pilot-visibility config; changes apply live to every trip (the pilot
 * Trip-prep view reads this config on each query). Recurring office tasks are not listed.
 */
export default function PilotVisibilityPanel() {
  const { store, tick, bump } = useSchedulingWorkspace();
  const [defs, setDefs] = useState<PilotTaskDef[]>([]);
  const [visible, setVisible] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [templates, vis] = await Promise.all([store.listPublishedTemplates(), store.getPilotVisibility()]);
      if (!cancelled) { setDefs(perTripTaskDefs(templates)); setVisible(new Set(vis)); }
    })();
    return () => { cancelled = true; };
  }, [store, tick]);

  async function toggle(id: string, on: boolean) {
    await store.setPilotVisible(id, on);
    bump();
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Pilot visibility</h2>
        <p className="text-sm text-muted-foreground">
          Choose which completed trip-prep items pilots can see. Changes apply to every trip.
        </p>
      </div>
      <div className="rounded-lg border divide-y">
        {defs.length === 0 && <p className="p-4 text-sm text-muted-foreground">No per-trip checklist items.</p>}
        {defs.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <span className="text-sm font-medium">{d.title}</span>
              <span className="ml-2 text-xs text-muted-foreground">{d.category}</span>
            </div>
            <Switch checked={visible.has(d.id)} onCheckedChange={(on: boolean) => toggle(d.id, on)} />
          </div>
        ))}
      </div>
    </section>
  );
}
