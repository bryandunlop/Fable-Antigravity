import { RotateCcw } from 'lucide-react';
import { Button } from '../../ui/button';
import { useResetTechLog } from '../TechLogContext';

export function ResetDemoButton() {
  const reset = useResetTechLog();
  return (
    <Button variant="outline" size="sm" onClick={reset} title="Reset all demo data to the seeded scenario">
      <RotateCcw className="mr-1.5 h-4 w-4" />
      Reset demo
    </Button>
  );
}
