import { ChevronDown, ChevronUp, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import type { StepFormModel, StepFormStep } from '../engine/stepForm';

/**
 * D75 — the semi-rigid authoring form: title/fleet/section live in the dialog around it, and this
 * owns the body — numbered steps (instruction + one optional photo) and one optional caution.
 *
 * "Semi-rigid" is the whole design: rigid enough that a flight attendant is never asked to know
 * markdown or discover a `[!STEP]` marker (LG-123), loose enough that the output is ordinary
 * blocks. Everything here is presentation over `StepFormModel`; the serialization lives in
 * `engine/stepForm` and is tested there.
 */
export function StepFormEditor({
  model,
  onChange,
}: {
  model: StepFormModel;
  onChange: (next: StepFormModel) => void;
}) {
  const setSteps = (steps: StepFormStep[]) => onChange({ ...model, steps });

  const patch = (i: number, next: Partial<StepFormStep>) =>
    setSteps(model.steps.map((s, x) => (x === i ? { ...s, ...next } : s)));

  const move = (i: number, dir: -1 | 1) => {
    const to = i + dir;
    if (to < 0 || to >= model.steps.length) return;
    const next = [...model.steps];
    [next[i], next[to]] = [next[to], next[i]];
    setSteps(next);
  };

  const add = () =>
    // Keyed off length + a nonce so a delete-then-add can't collide with a live key.
    setSteps([...model.steps, { key: `new-${model.steps.length}-${Math.random().toString(36).slice(2, 8)}`, text: '' }]);

  // Never drop to zero rows: an empty form should still show one place to start typing.
  const remove = (i: number) =>
    setSteps(model.steps.length === 1 ? [{ key: model.steps[0].key, text: '' }] : model.steps.filter((_, x) => x !== i));

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {model.steps.map((step, i) => (
          <div key={step.key} className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <Textarea
                  value={step.text}
                  onChange={(e) => patch(i, { text: e.target.value })}
                  rows={2}
                  aria-label={`Step ${i + 1} instruction`}
                  placeholder="What to do, in one instruction. Split anything with an 'and then' into two steps."
                  className="text-sm"
                />
                {step.photo === undefined ? (
                  <Button size="sm" variant="outline" onClick={() => patch(i, { photo: '' })}>
                    <ImagePlus className="mr-1.5 h-3.5 w-3.5" /> Add photo
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    {step.photo.trim() && (
                      <img
                        src={step.photo}
                        alt=""
                        className="h-10 w-14 shrink-0 rounded border border-border object-cover"
                      />
                    )}
                    <Input
                      value={step.photo}
                      onChange={(e) => patch(i, { photo: e.target.value })}
                      aria-label={`Step ${i + 1} photo`}
                      placeholder="Photo URL"
                      className="h-8 flex-1 text-sm"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={`Remove step ${i + 1} photo`}
                      onClick={() => patch(i, { photo: undefined })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col">
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Move step ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Move step ${i + 1} down`} disabled={i === model.steps.length - 1} onClick={() => move(i, 1)}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label={`Delete step ${i + 1}`} onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button size="sm" variant="outline" onClick={add}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add step
      </Button>

      <div>
        <Label htmlFor="stepFormCaution" className="text-xs">Caution (optional)</Label>
        <Textarea
          id="stepFormCaution"
          value={model.caution}
          onChange={(e) => onChange({ ...model, caution: e.target.value })}
          rows={2}
          placeholder="The one thing that goes wrong if nobody says it."
          className="mt-1 text-sm"
        />
      </div>
    </div>
  );
}
