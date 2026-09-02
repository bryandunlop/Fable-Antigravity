import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Check } from 'lucide-react';
import {
  FEEDBACK_IMPACTS,
  FEEDBACK_KINDS,
  type FeedbackAttachment,
  type FeedbackContext,
  type FeedbackImpact,
  type FeedbackKind,
} from './types';
import { captureContext, defaultArea } from './captureContext';
import { feedbackStore } from './feedbackStore';
import { ScreenshotField } from './ScreenshotField';

/** Field label: small, uppercase, quiet. The one type treatment the form repeats. */
function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] uppercase tracking-[0.07em] font-semibold text-muted-foreground mb-2"
    >
      {children}
    </label>
  );
}

/**
 * One screen, every field visible, no icons anywhere.
 *
 * It was three steps with a coloured icon card per kind. That read as a sticker
 * sheet, and the tints fought the aircraft RAG colours used everywhere else in the
 * app. The only colour left in this dialog is the accent ring on whichever choice
 * is selected.
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
  const [done, setDone] = useState('');
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [impact, setImpact] = useState<FeedbackImpact>('painful');
  const [area, setArea] = useState('');
  const [shareContext, setShareContext] = useState(true);
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([]);
  const [tried, setTried] = useState(false);

  // Captured when the dialog opens, not when it submits: the reporter may navigate
  // behind the modal, and the screen they were looking at is the one they mean.
  //
  // Read in an EFFECT rather than during render. The dialog is mounted closed
  // from the app chrome, so a render-time read can happen before the window has
  // been laid out and returns innerWidth 0 — which the capture then honestly but
  // uselessly records as "unknown". By the time this runs, layout has happened.
  const [context, setContext] = useState<FeedbackContext>(() =>
    captureContext({ pathname: location.pathname, role: userRole }),
  );

  useEffect(() => {
    if (!open) return;
    const captured = captureContext({
      pathname: location.pathname,
      role: userRole,
      viewportWidth: typeof window === 'undefined' ? undefined : window.innerWidth,
      viewportHeight: typeof window === 'undefined' ? undefined : window.innerHeight,
      userAgent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
    });
    setContext(captured);
    setArea(defaultArea(captured));
  }, [open, location.pathname, userRole]);

  useEffect(() => {
    if (!open) return;
    setDone('');
    setKind('bug');
    setTitle('');
    setDetail('');
    setImpact('painful');
    setShareContext(true);
    setAttachments([]);
    setTried(false);
  }, [open]);

  const missing = [!title.trim() && 'a summary', !detail.trim() && 'what happened'].filter(
    Boolean,
  ) as string[];

  function submit() {
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
      attachments,
    });
    setDone(report.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] p-0 gap-0">
        <DialogHeader className="px-7 pt-6 pb-5 border-b border-border">
          <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] pr-7">
            {done ? 'Thanks — that’s logged' : 'Tell us about myGFO'}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-relaxed text-left mt-1">
            {done
              ? 'It’s on the Feedback board. You can follow it there.'
              : 'Something broken, an idea, a change you want, or a question. It goes to the people who build this.'}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="px-7 py-9 text-center">
            <div className="w-12 h-12 rounded-full grid place-items-center mx-auto mb-4 sc-green">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-[16px] font-semibold mb-1.5">Logged as {done}</h4>
            <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-[360px] mx-auto">
              Nobody has to chase it — when it turns into a tracked issue you’ll see its number and
              status on the <b className="text-foreground font-medium">Feedback</b> board.
            </p>
          </div>
        ) : (
          <div className="px-7 py-6 max-h-[64vh] overflow-y-auto">
            <div className="mb-5">
              <FieldLabel>What are you telling us?</FieldLabel>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FEEDBACK_KINDS.map(({ kind: k, short, blurb }) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    aria-pressed={kind === k}
                    title={blurb}
                    className={`rounded-lg border px-3 py-3 text-[13.5px] transition-colors ${
                      kind === k
                        ? 'border-accent bg-accent/10 font-semibold text-foreground'
                        : 'border-border text-muted-foreground hover:border-accent/60 hover:text-foreground'
                    }`}
                  >
                    {short}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <FieldLabel htmlFor="fb-title">Summary</FieldLabel>
              <Input
                id="fb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Trip sheet prints the previous leg’s passengers"
                aria-invalid={tried && !title.trim()}
              />
            </div>

            <div className="mb-5">
              <FieldLabel htmlFor="fb-detail">
                {kind === 'help' ? 'What are you trying to do?' : 'What happened, and what did you expect'}
              </FieldLabel>
              <Textarea
                id="fb-detail"
                rows={4}
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

            <div className="mb-5">
              <FieldLabel>Impact</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_IMPACTS.map(({ impact: i, label, blurb }) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImpact(i)}
                    aria-pressed={impact === i}
                    title={blurb}
                    className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
                      impact === i
                        ? 'border-accent text-foreground'
                        : 'border-border text-muted-foreground hover:border-accent/60'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <FieldLabel htmlFor="fb-area">Which part of myGFO</FieldLabel>
              <Input id="fb-area" value={area} onChange={(e) => setArea(e.target.value)} />
            </div>

            <div>
              <FieldLabel>Screenshots</FieldLabel>
              <ScreenshotField attachments={attachments} onChange={setAttachments} />
            </div>

            {tried && missing.length > 0 && (
              <div className="mt-4 text-[12.5px] text-[color:var(--gfo-error)] font-medium">
                Still needed: {missing.join(' · ')}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="px-7 py-4 border-t border-border sm:justify-between items-center gap-3">
          {done ? (
            <>
              <span />
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </>
          ) : (
            <>
              <p className="text-[11.5px] text-muted-foreground leading-snug text-left m-0">
                Sending from <b className="text-foreground font-medium">{context.screen}</b> ·{' '}
                {context.role} · {context.viewport} ·{' '}
                <button
                  type="button"
                  onClick={() => setShareContext((v) => !v)}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {shareContext ? 'don’t include this' : 'include this'}
                </button>
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={submit}>Send</Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
