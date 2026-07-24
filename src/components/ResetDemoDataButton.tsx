import { RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { resetAllDemoData } from '../demo/demoReset';

// The single global "Reset demo data" control (D37 Wave-1 Q3). Wipes all persisted
// demo data and reloads to the shipped seed. Destructive, so it always confirms.
export function ResetDemoDataButton() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors rounded-full"
          title="Reset all demo data to the shipped seed"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden lg:inline">Reset demo</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears everything entered in the demo — squawks, requests, edits, quick
            links, and layout preferences — and reloads the app to its shipped seed. It
            can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={resetAllDemoData}>Reset demo data</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
