// ─── Inspection Form — Full Inspection Page ─────────────────────────────────

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Scan, RotateCcw, Settings, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
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
} from '../../ui/alert-dialog';

import { V2Badge } from '../shared/V2Badge';
import { SearchableUnitSelect } from '../shared/SearchableUnitSelect';
import { CompartmentSection } from '../shared/CompartmentSection';
import { ItemRow } from '../shared/ItemRow';
import { BarcodeScannerDialog } from '../shared/BarcodeScannerDialog';
import DisplaySettingsOverlay from '../shared/DisplaySettingsOverlay';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

import { useInventoryV2 } from '../InventoryV2Context';
import { V2_THEME, MOCK_USERS } from '../constants';
import { getCompartmentsForAircraft } from '../compartmentConfig';

import type { InspectionCheckedItem } from '../types';

// ─── Session Storage Key ───────────────────────────────────────────────────

const SESSION_KEY = 'inv-v2-inspection-draft';

// ─── Helper: build initial checked items for a given aircraft type ─────────

function buildInitialCheckedItems(
  aircraftType: 'G650' | 'G500',
  items: import('../types').InventoryItemV2[],
): Map<string, InspectionCheckedItem> {
  const map = new Map<string, InspectionCheckedItem>();

  items.forEach((item) => {
    const requiredQty = item.defaultQuantities[aircraftType];
    if (requiredQty == null) return;

    map.set(item.id, {
      itemId: item.id,
      requiredQty,
      qtyInUnit: requiredQty,
      done: false,
      workOrderFlag: false,
      notes: '',
    });
  });

  return map;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function InspectionForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state } = useInventoryV2();

  // ── Local state ──
  const [selectedUser, setSelectedUser] = useState<typeof MOCK_USERS[number]>(MOCK_USERS[0]);
  const [selectedTailNumber, setSelectedTailNumber] = useState('');
  const [checkedItems, setCheckedItems] = useState<Map<string, InspectionCheckedItem>>(
    new Map(),
  );
  const [scannerOpen, setScannerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState(false);

  // ── Refs ──
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const didResume = React.useRef(false);
  const didDetectDraft = React.useRef(false);

  // ── Auto-save draft to sessionStorage on every change (debounced 500ms) ──
  useEffect(() => {
    if (!selectedTailNumber || checkedItems.size === 0) return;

    const aircraft = state.fleet.find((a) => a.tailNumber === selectedTailNumber);
    if (!aircraft) return;

    autoSaveTimerRef.current = setTimeout(() => {
      const draft = {
        tailNumber: selectedTailNumber,
        aircraftType: aircraft.type,
        checkedItems: Array.from(checkedItems.values()),
        readinessScore: 0, // recalculated on review
      };
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
      } catch {
        // storage full — silently ignore
      }
    }, 500);

    return () => clearTimeout(autoSaveTimerRef.current);
  }, [selectedTailNumber, checkedItems, state.fleet]);

  // ── Detect unsaved draft on mount (only when not resuming via ?resume) ──
  useEffect(() => {
    if (didDetectDraft.current) return;
    const resumeId = searchParams.get('resume');
    if (resumeId) return; // Task 2 handles this case

    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      didDetectDraft.current = true;
      setHasUnsavedDraft(true);
    }
  }, [searchParams]);

  // ── Resume in-progress inspection ──
  useEffect(() => {
    if (didResume.current) return;
    const resumeId = searchParams.get('resume');
    if (!resumeId) return;

    const inspection = state.inspections.find((i) => i.id === resumeId);
    if (!inspection) {
      toast.error('Inspection not found');
      return;
    }

    didResume.current = true;
    setSelectedTailNumber(inspection.tailNumber);

    // Restore checkedItems map from saved inspection
    const restored = new Map<string, InspectionCheckedItem>();
    inspection.checkedItems.forEach((ci) => {
      restored.set(ci.itemId, ci);
    });
    setCheckedItems(restored);

    toast.info(`Resuming inspection for ${inspection.tailNumber}`);
  }, [searchParams, state.inspections]);

  // ── Derived ──
  const selectedAircraft = useMemo(
    () => state.fleet.find((a) => a.tailNumber === selectedTailNumber),
    [selectedTailNumber, state.fleet],
  );

  const aircraftType = selectedAircraft?.type;

  const compartments = useMemo(
    () =>
      aircraftType
        ? getCompartmentsForAircraft(state.compartmentConfigs, aircraftType)
        : [],
    [aircraftType, state.compartmentConfigs],
  );

  // Items applicable to this aircraft, keyed by compartment
  const itemsByCompartment = useMemo(() => {
    if (!aircraftType) return new Map<string, typeof state.items>();
    const map = new Map<string, typeof state.items>();

    state.items.forEach((item) => {
      if (item.defaultQuantities[aircraftType] == null) return;
      const list = map.get(item.compartmentId) ?? [];
      list.push(item);
      map.set(item.compartmentId, list);
    });

    return map;
  }, [aircraftType, state.items]);

  // ── Handlers ──

  const handleAircraftChange = useCallback(
    (tailNumber: string) => {
      const aircraft = state.fleet.find((a) => a.tailNumber === tailNumber);
      if (!aircraft) return;

      setSelectedTailNumber(tailNumber);
      setCheckedItems(buildInitialCheckedItems(aircraft.type, state.items));
    },
    [state.fleet, state.items],
  );

  const handleQtyChange = useCallback(
    (itemId: string, newQty: number) => {
      setCheckedItems((prev) => {
        const next = new Map(prev);
        const existing = next.get(itemId);
        if (existing) {
          next.set(itemId, { ...existing, qtyInUnit: Math.max(0, newQty) });
        }
        return next;
      });
    },
    [],
  );

  const handleDoneChange = useCallback(
    (itemId: string, done: boolean) => {
      setCheckedItems((prev) => {
        const next = new Map(prev);
        const existing = next.get(itemId);
        if (existing) {
          next.set(itemId, { ...existing, done });
        }
        return next;
      });
    },
    [],
  );

  const handleWorkOrderChange = useCallback(
    (itemId: string, workOrderFlag: boolean) => {
      setCheckedItems((prev) => {
        const next = new Map(prev);
        const existing = next.get(itemId);
        if (existing) {
          next.set(itemId, { ...existing, workOrderFlag });
        }
        return next;
      });
    },
    [],
  );

  const handleNotesChange = useCallback(
    (itemId: string, notes: string) => {
      setCheckedItems((prev) => {
        const next = new Map(prev);
        const existing = next.get(itemId);
        if (existing) {
          next.set(itemId, { ...existing, notes });
        }
        return next;
      });
    },
    [],
  );

  const handleZeroOut = useCallback(() => {
    setCheckedItems((prev) => {
      const next = new Map(prev);
      next.forEach((item, key) => {
        next.set(key, { ...item, qtyInUnit: 0 });
      });
      return next;
    });
    toast.success('All quantities set to zero');
  }, []);

  const handleBarcodeScanned = useCallback(
    (itemId: string) => {
      const checked = checkedItems.get(itemId);
      if (checked) {
        // Mark as done when scanned
        setCheckedItems((prev) => {
          const next = new Map(prev);
          next.set(itemId, { ...checked, done: true });
          return next;
        });
        const item = state.items.find((i) => i.id === itemId);
        toast.success(`Scanned: ${item?.itemName ?? itemId}`);
      } else {
        toast.error('Item not found on this aircraft');
      }
      setScannerOpen(false);
    },
    [checkedItems],
  );

  const handleReview = useCallback(() => {
    clearTimeout(autoSaveTimerRef.current);

    if (!selectedTailNumber || !aircraftType) {
      toast.error('Please select an aircraft first');
      return;
    }

    // Calculate readiness
    let totalRequired = 0;
    let totalOnHand = 0;
    checkedItems.forEach((item) => {
      totalRequired += item.requiredQty;
      totalOnHand += Math.min(item.qtyInUnit, item.requiredQty);
    });
    const readinessScore =
      totalRequired > 0 ? Math.round((totalOnHand / totalRequired) * 100) : 100;

    // Persist draft to sessionStorage
    const draft = {
      tailNumber: selectedTailNumber,
      aircraftType,
      checkedItems: Array.from(checkedItems.values()),
      readinessScore,
      reportedBy: selectedUser.name,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
    navigate('/inventory-v2/inspection/new/review');
  }, [selectedTailNumber, aircraftType, checkedItems, selectedUser, navigate]);

  // ── Readiness stats per compartment ──

  const compartmentReadiness = useCallback(
    (compartmentId: string): number => {
      const items = itemsByCompartment.get(compartmentId) ?? [];
      if (items.length === 0) return 100;

      let totalReq = 0;
      let totalOn = 0;
      items.forEach((item) => {
        const checked = checkedItems.get(item.id);
        if (checked) {
          totalReq += checked.requiredQty;
          totalOn += Math.min(checked.qtyInUnit, checked.requiredQty);
        }
      });

      return totalReq > 0 ? Math.round((totalOn / totalReq) * 100) : 100;
    },
    [itemsByCompartment, checkedItems],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">New Inspection</h1>
          <V2Badge variant="v2" />
        </div>

        <div className="flex items-center gap-2">
          {/* Barcode Scanner */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScannerOpen(true)}
            disabled={!selectedTailNumber}
            title="Scan barcode"
          >
            <Scan className="h-4 w-4" />
          </Button>

          {/* Zero Out */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={!selectedTailNumber}
                title="Zero out all quantities"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Zero Out All Quantities?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will set every item&apos;s quantity to 0. You can adjust
                  individual items after. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleZeroOut}>
                  Zero Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Display Settings */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            title="Display settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Inspector Selector ── */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Inspector
        </label>
        <Select
          value={selectedUser.id}
          onValueChange={(id: string) => {
            const user = MOCK_USERS.find((u) => u.id === id);
            if (user) setSelectedUser(user);
          }}
        >
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOCK_USERS.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Aircraft Selector ── */}
      <Card className="bg-card/60 backdrop-blur-md border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Select Aircraft
          </CardTitle>
        </CardHeader>
        <CardContent>
          {searchParams.get('resume') && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
              <span>↩</span>
              <span>Resuming in-progress inspection</span>
            </div>
          )}
          {hasUnsavedDraft && !searchParams.get('resume') && (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400">
              <span>↩ You have an unsaved draft from a previous session</span>
              <div className="flex gap-2">
                <button
                  className="underline"
                  onClick={() => {
                    try {
                      const raw = sessionStorage.getItem(SESSION_KEY);
                      if (!raw) return;
                      const draft = JSON.parse(raw);
                      setSelectedTailNumber(draft.tailNumber);
                      const restored = new Map<string, InspectionCheckedItem>();
                      draft.checkedItems.forEach((ci: InspectionCheckedItem) => {
                        if (!ci?.itemId) return;
                        restored.set(ci.itemId, ci);
                      });
                      setCheckedItems(restored);
                      setHasUnsavedDraft(false); // only on success
                    } catch {
                      toast.error('Could not restore draft — it may be corrupted');
                      sessionStorage.removeItem(SESSION_KEY);
                      setHasUnsavedDraft(false);
                    }
                  }}
                >
                  Resume
                </button>
                <button
                  className="underline opacity-60"
                  onClick={() => {
                    sessionStorage.removeItem(SESSION_KEY);
                    setHasUnsavedDraft(false);
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          )}
          <SearchableUnitSelect
            value={selectedTailNumber}
            onValueChange={handleAircraftChange}
          />
          {selectedAircraft && (
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedAircraft.displayName} —{' '}
              {checkedItems.size} items to inspect
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── No Aircraft Selected ── */}
      {!selectedTailNumber && (
        <Card className="bg-card/60 backdrop-blur-md border-border/40">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground text-lg">
              Select an aircraft above to begin the inspection
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Compartment Sections ── */}
      {selectedTailNumber &&
        aircraftType &&
        compartments.map((compartment) => {
          const items = itemsByCompartment.get(compartment.id) ?? [];
          if (items.length === 0) return null;

          const readiness = compartmentReadiness(compartment.id);

          return (
            <CompartmentSection
              key={compartment.id}
              compartment={compartment}
              itemCount={items.length}
              readinessPct={readiness}
              defaultOpen={true}
            >
              <div className="space-y-1">
                {items.map((item) => {
                  const checked = checkedItems.get(item.id);
                  if (!checked) return null;

                  return (
                    <ItemRow
                      key={item.id}
                      item={item}
                      qtyValue={checked.qtyInUnit}
                      requiredQty={checked.requiredQty}
                      onQtyChange={(qty) => handleQtyChange(item.id, qty)}
                      showDone
                      doneChecked={checked.done}
                      onDoneChange={(done) => handleDoneChange(item.id, done)}
                      showWorkOrder
                      workOrderChecked={checked.workOrderFlag}
                      onWorkOrderChange={(wo) =>
                        handleWorkOrderChange(item.id, wo)
                      }
                      showNotes
                      notesValue={checked.notes}
                      onNotesChange={(notes) =>
                        handleNotesChange(item.id, notes)
                      }
                      displaySettings={state.displaySettings}
                    />
                  );
                })}
              </div>
            </CompartmentSection>
          );
        })}

      {/* ── Footer: Review Button ── */}
      {selectedTailNumber && (
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border/40 -mx-4 md:-mx-6 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {Array.from(checkedItems.values()).filter((c) => c.done).length} /{' '}
              {checkedItems.size} items checked
            </p>
            <Button
              onClick={handleReview}
              className={`${V2_THEME.accentBg} text-white hover:bg-purple-600`}
            >
              Review
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onItemScanned={handleBarcodeScanned}
      />

      <DisplaySettingsOverlay
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
