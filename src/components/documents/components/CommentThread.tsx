import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { getRoleLabelByValue } from '../../../lib/mockUsers';
import type { Doc } from '../types';
import { useDocuments } from '../DocumentsContext';

/** Discussion thread for comment-enabled classes (tribal knowledge). */
export function CommentThread({ doc, userRole }: { doc: Doc; userRole: string }) {
  const { state, addComment } = useDocuments();
  const [text, setText] = useState('');
  const comments = state.comments
    .filter((c) => c.docId === doc.id)
    .sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc));

  const submit = () => {
    if (text.trim().length < 3) {
      toast.error('Write a comment first.');
      return;
    }
    addComment(doc.id, text, userRole);
    setText('');
  };

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet — field reports welcome.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md border border-border p-3 text-sm">
              <p>{c.text}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {c.authorName} ({getRoleLabelByValue(c.role)}) · {new Date(c.createdAtUtc).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add what you learned in the field…"
          rows={2}
          className="flex-1"
        />
        <Button size="sm" onClick={submit} className="shrink-0">
          <Send className="mr-1.5 h-3.5 w-3.5" /> Comment
        </Button>
      </div>
    </div>
  );
}
