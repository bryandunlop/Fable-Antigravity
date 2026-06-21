import { UserCog } from 'lucide-react';
import { useTechLog } from '../TechLogContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

export function PersonaSwitcher() {
  const { state, dispatch } = useTechLog();
  return (
    <div className="flex items-center gap-2" title="Demo persona (no real auth)">
      <UserCog className="h-4 w-4 text-muted-foreground" />
      <Select value={state.currentUserOid} onValueChange={v => dispatch({ type: 'SET_PERSONA', payload: v })}>
        <SelectTrigger className="h-9 w-[240px]">
          <SelectValue placeholder="Persona" />
        </SelectTrigger>
        <SelectContent>
          {state.personnel.map(p => (
            <SelectItem key={p.oid} value={p.oid}>
              {p.displayName} · {p.role === 'PILOT' ? 'Pilot' : 'Maint'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
