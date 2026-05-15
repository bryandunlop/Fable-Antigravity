// ─── Inspection Review — Pre-Submission Review Screen ────────────────────────

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Camera, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Checkbox } from '../../ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';

import { V2Badge } from '../shared/V2Badge';

import { useInventoryV2 } from '../InventoryV2Context';
import { V2_THEME, MOCK_USERS } from '../constants';
import { getCompartmentLabel } from '../compartmentConfig';

import type {
  InspectionCheckedItem,
  AdditionalFee,
  MissingItemCharge,
  InspectionV2,
} from '../types';

// ─── Session Storage Key (must match InspectionForm) ────────────────────────

const SESSION_KEY = 'inv-v2-inspection-draft';

// ─── Types ─────────────────────────────────────────────────────────────────

interface InspectionDraft {
  tailNumber: string;
  aircraftType: 'G650' | 'G500';
  checkedItems: InspectionCheckedItem[];
  readinessScore: number;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function InspectionReview() {
  const navigate = useNavigate();
  const { state, dispatch } = useInventoryV2();

  // ── Load draft from sessionStorage ──
  const [draft, setDraft] = useState<InspectionDraft | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        setDraft(JSON.parse(raw) as InspectionDraft);
      }
    } catch {
      // corrupt data — ignore
    }
  }, []);

  // ── Local form state ──
  const [topLevelNotes, setTopLevelNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [reservationId, setReservationId] = useState('');
  const [additionalFees, setAdditionalFees] = useState<AdditionalFee[]>([]);

  // ── Cost overrides for missing items ──
  const [costOverrides, setCostOverrides] = useState<Record<string, number>>({});
  const [chargeFlags, setChargeFlags] = useState<Record<string, boolean>>({});

  // ── Derived: aircraft info ──
  const aircraft = useMemo(
    () => (draft ? state.fleet.find((a) => a.tailNumber === draft.tailNumber) : null),
    [draft, state.fleet],
  );

  // ── Derived: missing items (qty < required) ──
  const missingItems = useMemo(() => {
    if (!draft) return [];

    return draft.checkedItems
      .filter((ci) => ci.qtyInUnit < ci.requiredQty)
      .map((ci) => {
        const item = state.items.find((i) => i.id === ci.itemId);
        const qtyMissing = ci.requiredQty - ci.qtyInUnit;
        const defaultCost = item?.costPerUnit ?? 0;

        return {
          itemId: ci.itemId,
          description: item?.itemName ?? `Item ${ci.itemId}`,
          qtyMissing,
          compartmentId: item?.compartmentId ?? '',
          defaultCost,
        };
      });
  }, [draft]);

  // Initialize charge flags for new missing items
  useEffect(() => {
    const flags: Record<string, boolean> = {};
    missingItems.forEach((mi) => {
      flags[mi.itemId] = chargeFlags[mi.itemId] ?? false;
    });
    setChargeFlags(flags);
    // Only run when missing items change, not chargeFlags
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingItems.length]);

  // ── Handlers: Additional Fees ──

  const handleAddFee = useCallback(() => {
    setAdditionalFees((prev) => [
      ...prev,
      {
        id: `fee-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description: '',
        amount: 0,
      },
    ]);
  }, []);

  const handleUpdateFee = useCallback(
    (id: string, field: 'description' | 'amount', value: string | number) => {
      setAdditionalFees((prev) =>
        prev.map((fee) => (fee.id === id ? { ...fee, [field]: value } : fee)),
      );
    },
    [],
  );

  const handleRemoveFee = useCallback((id: string) => {
    setAdditionalFees((prev) => prev.filter((fee) => fee.id !== id));
  }, []);

  // ── Handler: Photo upload ──

  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (dataUrl) {
            setPhotos((prev) => [...prev, dataUrl]);
          }
        };
        reader.readAsDataURL(file);
      });

      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [],
  );

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Handler: Cost override ──

  const handleCostChange = useCallback((itemId: string, cost: number) => {
    setCostOverrides((prev) => ({ ...prev, [itemId]: cost }));
  }, []);

  // ── Handler: Charge toggle ──

  const handleChargeToggle = useCallback((itemId: string, charged: boolean) => {
    setChargeFlags((prev) => ({ ...prev, [itemId]: charged }));
  }, []);

  // ── Computed: running total ──

  const runningTotal = useMemo(() => {
    let total = 0;

    // Missing item charges where chargeToGuest is true
    missingItems.forEach((mi) => {
      if (chargeFlags[mi.itemId]) {
        const cost = costOverrides[mi.itemId] ?? mi.defaultCost;
        total += mi.qtyMissing * cost;
      }
    });

    // Additional fees
    additionalFees.forEach((fee) => {
      total += fee.amount || 0;
    });

    return total;
  }, [missingItems, chargeFlags, costOverrides, additionalFees]);

  // ── Handler: Complete Inspection ──

  const handleComplete = useCallback(() => {
    if (!draft || !aircraft) {
      toast.error('No inspection data found');
      return;
    }

    // Build missing item charges
    const charges: MissingItemCharge[] = missingItems.map((mi) => {
      const cost = costOverrides[mi.itemId] ?? mi.defaultCost;
      return {
        itemId: mi.itemId,
        description: mi.description,
        qtyMissing: mi.qtyMissing,
        fromCompartment: mi.compartmentId,
        costPerUnit: cost,
        total: mi.qtyMissing * cost,
        chargeToGuest: chargeFlags[mi.itemId] ?? false,
      };
    });

    const inspection: InspectionV2 = {
      id: `insp-${Date.now()}`,
      tailNumber: draft.tailNumber,
      aircraftType: draft.aircraftType,
      date: new Date().toISOString(),
      reportedBy: MOCK_USERS[0].name, // default to first user
      reservationId: reservationId || undefined,
      status: 'submitted',
      checkedItems: draft.checkedItems,
      topLevelNotes,
      photos,
      additionalFees,
      missingItemCharges: charges,
      readinessScore: draft.readinessScore,
      submittedAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_INSPECTION', payload: inspection });

    // Clean up session storage
    sessionStorage.removeItem(SESSION_KEY);

    toast.success('Inspection completed successfully');
    navigate('/inventory-v2/my-inspections');
  }, [
    draft,
    aircraft,
    missingItems,
    costOverrides,
    chargeFlags,
    topLevelNotes,
    photos,
    additionalFees,
    reservationId,
    dispatch,
    navigate,
  ]);

  // ── No draft — redirect ──

  if (!draft) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <Card className="bg-card/60 backdrop-blur-md border-border/40">
          <CardContent className="py-16 text-center space-y-4">
            <p className="text-muted-foreground text-lg">
              No inspection data found. Please start a new inspection.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/inventory-v2/inspection')}
            >
              Start New Inspection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Review Inspection
          </h1>
          <V2Badge variant="v2" />
        </div>
        {aircraft && (
          <p className="text-sm text-muted-foreground">
            {aircraft.displayName} — Readiness: {draft.readinessScore}%
          </p>
        )}
      </div>

      {/* ── Section 1: Top-Level Notes ── */}
      <Card className="bg-card/60 backdrop-blur-md border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Inspection Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any overall notes about this inspection..."
            value={topLevelNotes}
            onChange={(e) => setTopLevelNotes(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* ── Section 2: Photo Attachment ── */}
      <Card className="bg-card/60 backdrop-blur-md border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="cursor-pointer"
            />
          </div>

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative group w-24 h-24 rounded-lg overflow-hidden border border-border/40"
                >
                  <img
                    src={photo}
                    alt={`Inspection photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 3: Reservation ID ── */}
      <Card className="bg-card/60 backdrop-blur-md border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Reservation ID
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Enter reservation ID (optional)"
            value={reservationId}
            onChange={(e) => setReservationId(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      {/* ── Section 4: Additional Fees ── */}
      <Card className="bg-card/60 backdrop-blur-md border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Additional Fees
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddFee}
              className="h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Fee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {additionalFees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No additional fees added
            </p>
          ) : (
            <div className="space-y-3">
              {additionalFees.map((fee) => (
                <div key={fee.id} className="flex items-center gap-3">
                  <Input
                    placeholder="Description"
                    value={fee.description}
                    onChange={(e) =>
                      handleUpdateFee(fee.id, 'description', e.target.value)
                    }
                    className="flex-1"
                  />
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={fee.amount || ''}
                      onChange={(e) =>
                        handleUpdateFee(
                          fee.id,
                          'amount',
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="pl-7"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFee(fee.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 5: Missing Items Table ── */}
      {missingItems.length > 0 && (
        <Card className="bg-card/60 backdrop-blur-md border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Missing Items ({missingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/40 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center w-24">Qty Missing</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead className="text-right w-28">Cost</TableHead>
                    <TableHead className="text-right w-28">Total</TableHead>
                    <TableHead className="text-center w-20">Charge?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingItems.map((mi) => {
                    const cost = costOverrides[mi.itemId] ?? mi.defaultCost;
                    const total = mi.qtyMissing * cost;
                    const compartmentLabel = draft
                      ? getCompartmentLabel(
                          state.compartmentConfigs,
                          draft.aircraftType,
                          mi.compartmentId,
                        )
                      : mi.compartmentId;

                    return (
                      <TableRow key={mi.itemId}>
                        <TableCell className="font-medium">
                          {mi.description}
                        </TableCell>
                        <TableCell className="text-center">
                          {mi.qtyMissing}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {compartmentLabel}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="relative w-24 ml-auto">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                              $
                            </span>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={cost}
                              onChange={(e) =>
                                handleCostChange(
                                  mi.itemId,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="pl-5 h-8 text-sm text-right"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={chargeFlags[mi.itemId] ?? false}
                              onCheckedChange={(checked: boolean) =>
                                handleChargeToggle(mi.itemId, !!checked)
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Section 6: Running Total ── */}
      <Card className="bg-card/60 backdrop-blur-md border-border/40">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold tabular-nums">
              ${runningTotal.toFixed(2)}
            </span>
          </div>
          {runningTotal > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Includes charged missing items and additional fees
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Footer ── */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border/40 -mx-4 md:-mx-6 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/inventory-v2/inspection')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            className={`${V2_THEME.accentBg} text-white hover:bg-purple-600`}
          >
            <Check className="mr-2 h-4 w-4" />
            Complete Inspection
          </Button>
        </div>
      </div>
    </div>
  );
}
