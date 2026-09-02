import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Bug, Lightbulb, PencilRuler, LifeBuoy, Check } from 'lucide-react';
import { FEEDBACK_IMPACTS, FEEDBACK_KINDS, type FeedbackImpact, type FeedbackKind } from './types';
import { captureContext, defaultArea } from './captureContext';
import { feedbackStore } from './feedbackStore';

const ICONS: Record<FeedbackKind, typeof Bug> = {
  bug: Bug,
  idea: Lightbulb,
  change: PencilRuler,
  help: LifeBuoy,
};

const TINT: Record<FeedbackKind, string> = {
  bug: 'color-mix(in srgb, var(--gfo-error) 14%, transparent)',
  idea: 'color-mix(in srgb, var(--gfo-sunrise) 22%, transparent)',
  change: 'color-mix(in srgb, var(--accent) 12%, transparent)',
  help: 'color-mix(in srgb, var(--gfo-warning) 20%, transparent)',
};

/**
 * Capture, three steps: what kind → the report → done.
 *
 * The report is saved locally on submit and is NOT filed to Jira here. Filing is a
 * triage decision made on the Feedback board — a reporter should never wait on a
 * network round trip to a system they do not have an account on, and half the
 * value of triage is that not every report becomes an issue.
 */
export function FeedbackDialog({
  open,
  onOpenChange,
  userRole,
  reporter,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userRole: string;
  reporter: string;
}) {
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [impact, setImpact] = useState<FeedbackImpact>('painful');
  const [area, setArea] = useState('');
  const [shareContext, setShareContext] = useState(true);
  const [tried, setTried] = useState(false);
  const [filedId, setFiledId] = useState('');

  // Captured when the dialog opens, not when it submits: the reporter may navigate
  // behind the modal, and the screen they were looking at is the one they mean.
  const context = useMemo(
    () =>
      captureContext({
        pathname: location.pathname,
        role: userRole,
        viewportWidth: typeof window === 'undefined' ? undefined : window.innerWidth,
        viewportHeight: typeof window === 'undefined' ? undefined : window.innerHeight,
        userAgent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setKind(null);
    setTitle('');
    setDetail('');
    setImpact('painful');
    setArea(defaultArea(context));
    setShareContext(true);
    setTried(false);
    setFiledId('');
  }, [open, context]);

  const meta = kind ? FEEDBACK_KINDS.find((k) => k.kind === kind)! : null;
  const missing = [!title.trim() && 'a one-line summary', !detail.trim() && 'what happened'].filter(
    Boolean,
  ) as string[];

  function submit() {
    if (!kind) return;
    if (missing.length) {
      setTried(true);
      return;
    }
    const report = feedbackStore.create({
      kind,
      title: title.trim(),
      detail: detail.trim(),
      impact,
      area: area.trim() || 'Other',
      reporter,
      shareContext,
      context,
    });
    setFiledId(report.id);
    setStep(2);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          {/* pr-7 keeps the step counter clear of the dialog's own close button,
              which is absolutely positioned in the same top-right corner. */}
          <div className="flex items-center justify-between pr-7">
            <DialogTitle className="text-base">
              {step === 2 ? 'Thanks — that’s logged' : meta ? meta.label : 'Tell us about myGFO'}
            </DialogTitle>
            <span className="text-xs text-muted-foreground font-semibold">
              {step === 2 ? 'Done' : `Step ${step + 1} of 3`}
            </span>
          </div>
          <DialogDescription className="text-[12.5px] leading-snug text-left">
            {step === 2
              ? 'It’s on the Feedback board. You can follow it there.'
              : meta
                ? meta.blurb
                : 'Bugs, ideas, change requests, or a question. Anything about the software itself.'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 max-h-[62vh] overflow-y-auto">
          {step === 0 && (
            <div className="flex flex-col gap-2.5">
              {FEEDBACK_KINDS.map(({ kind: k, label, blurb }) => {
                const Icon = ICONS[k];
                return (
                  <button
                    key={k}
                    onClick={() => {
                      setKind(k);
                      setStep(1);
                    }}
                    className="text-left border border-border rounded-lg p-3.5 flex gap-3 items-start hover:border-accent hover:bg-accent/5 transition-colors"
                  >
                    <div
                      className="w-[34px] h-[34px] rounded-md grid place-items-center shrink-0"
                      style={{ background: TINT[k] }}
                    >
                      <Icon className="w-[17px] h-[17px] text-foreground" />
                    </div>
                    <div>
                      <div className="text-[14.5px] font-semibold">{label}</div>
                      <div className="text-[12.5px] text-muted-foreground mt-0.5 leading-snug">{blurb}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fb-title">One line — what is it?</Label>
                <Input
                  id="fb-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Trip sheet prints the previous leg’s passengers"
                  aria-invalid={tried && !title.trim()}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fb-detail">
                  {kind === 'help' ? 'What are you trying to do?' : 'What happened, and what did you expect?'}
                </Label>
                <Textarea
                  id="fb-detail"
                  rows={5}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder={
                    kind === 'bug'
                      ? 'What you did, what it did, what you expected instead.'
                      : 'As much or as little as you like.'
                  }
                  aria-invalid={tried && !detail.trim()}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>How much is this costing you?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {FEEDBACK_IMPACTS.map(({ impact: i, label, blurb }) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setImpact(i)}
                      aria-pressed={impact === i}
                      className={`text-left border rounded-lg px-3 py-2 transition-colors ${
                        impact === i ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/60'
                      }`}
                    >
                      <div className="text-[13px] font-semibold">{label}</div>
                      <div className="text-[11.5px] text-muted-foreground leading-snug">{blurb}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fb-area">Which part of myGFO?</Label>
                <Input id="fb-area" value={area} onChange={(e) => setArea(e.target.value)} />
              </div>

              <label className="flex gap-2.5 items-start rounded-md border border-border px-3 py-2.5 cursor-pointer">
                <Checkbox
                  checked={shareContext}
                  onCheckedChange={(v: boolean | 'indeterminate') => setShareContext(v === true)}
                  className="mt-0.5"
                />
                <span className="text-[12.5px] leading-snug">
                  <span className="font-medium">Include where I was.</span>{' '}
                  <span className="text-muted-foreground">
                    {context.screen} ({context.route}) · {context.role} · {context.viewport} · myGFO{' '}
                    {context.appVersion}
                  </span>
                </span>
              </label>

              {tried && missing.length > 0 && (
                <div className="text-[12.5px] text-[color:var(--gfo-error)] font-medium">
                  Still needed: {missing.join(' · ')}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="text-center pt-3 pb-1">
              <div className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-3.5 sc-green">
                <Check className="w-7 h-7" />
              </div>
              <h4 className="text-[17px] font-semibold mb-1.5">Logged as {filedId}</h4>
              <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-[360px] mx-auto">
                It’s on the <b className="text-foreground font-medium">Feedback</b> board. Nobody has to
                chase it — when it turns into a tracked issue you’ll see its number and status there.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          {step === 0 && (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === 1 && (
            <>
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={submit}>Send it</Button>
            </>
          )}
          {step === 2 && <Button onClick={() => onOpenChange(false)}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
