import { Hono } from 'hono';
import * as schema from '../db/schema';
import type { Db } from '../db';
import type { Trip, TripLeg, GroceryList } from '../../components/inventory-v2/types';

type Env = { Variables: { db: Db } };

const state = new Hono<Env>();

state.get('/', async (c) => {
  const db = c.get('db');

  const [
    fleetRows,
    itemRows,
    stockroomRows,
    stockroomItemRows,
    inspectionRows,
    pickListRows,
    restockListRows,
    requestRows,
    tripRows,
    tripLegRows,
    usageLogRows,
    tripNoteRows,
    tripLoadRows,
    tripReturnRows,
    groceryListRows,
    groceryItemRows,
    stockBatchRows,
    alertThresholdRows,
    activityLogRows,
    storageLocationRows,
  ] = await Promise.all([
    db.select().from(schema.fleet),
    db.select().from(schema.items),
    db.select().from(schema.stockrooms),
    db.select().from(schema.stockroomItems),
    db.select().from(schema.inspections),
    db.select().from(schema.pickListItems),
    db.select().from(schema.restockListItems),
    db.select().from(schema.unitItemRequests),
    db.select().from(schema.trips),
    db.select().from(schema.tripLegs),
    db.select().from(schema.usageLogEntries),
    db.select().from(schema.tripNotes),
    db.select().from(schema.tripLoadItems),
    db.select().from(schema.tripReturnItems),
    db.select().from(schema.groceryLists),
    db.select().from(schema.groceryListItems),
    db.select().from(schema.stockBatches),
    db.select().from(schema.alertThresholds),
    db.select().from(schema.activityLog),
    db.select().from(schema.storageLocations),
  ]);

  // Normalize trip notes: DB legId is nullable, client type uses optional
  const normalizedTripNotes = tripNoteRows.map((n) => ({
    ...n,
    legId: n.legId ?? undefined,
  }));

  // Assemble trips with nested legs / notes / loadItems / returnItems
  const assembledTrips: Trip[] = tripRows.map((t) => {
    const legs: TripLeg[] = tripLegRows
      .filter((l) => l.tripId === t.id)
      .sort((a, b) => a.legNumber - b.legNumber)
      .map((l) => ({
        ...l,
        usageLog: usageLogRows.filter((u) => u.legId === l.id),
        notes: normalizedTripNotes.filter((n) => n.tripId === t.id && n.legId === l.id),
        groceryListId: l.groceryListId ?? undefined,
      }));

    return {
      ...t,
      tripName: t.tripName ?? undefined,
      tripNumber: t.tripNumber ?? undefined,
      endDate: t.endDate ?? undefined,
      baselineConfirmedAt: t.baselineConfirmedAt ?? undefined,
      lastEditedBy: t.lastEditedBy ?? undefined,
      lastEditedAt: t.lastEditedAt ?? undefined,
      legs,
      notes: normalizedTripNotes.filter((n) => n.tripId === t.id && !n.legId),
      loadItems: tripLoadRows
        .filter((li) => li.tripId === t.id)
        .map((li) => ({ ...li, legId: li.legId ?? undefined })),
      returnItems: tripReturnRows.filter((ri) => ri.tripId === t.id),
    };
  });

  // Assemble grocery lists with nested items (normalize nullable manualItemName)
  const assembledGroceryLists: GroceryList[] = groceryListRows.map((gl) => ({
    ...gl,
    legId: gl.legId ?? undefined,
    notes: gl.notes ?? undefined,
    items: groceryItemRows
      .filter((gi) => gi.groceryListId === gl.id)
      .map((gi) => ({
        ...gi,
        manualItemName: gi.manualItemName ?? undefined,
      })),
  }));

  // Items: include zeroed runtime fields the client computes per-aircraft
  const clientItems = itemRows.map((item) => ({
    ...item,
    currentQuantity: 0,
    requiredQuantity: 0,
    needsReplenishment: false,
    priority: 'low' as const,
  }));

  return c.json({
    fleet: fleetRows,
    items: clientItems,
    stockrooms: stockroomRows,
    stockroomItems: stockroomItemRows,
    inspections: inspectionRows,
    pickListItems: pickListRows,
    restockListItems: restockListRows,
    unitItemRequests: requestRows,
    purchaseOrders: [],         // POs descoped — always empty
    compartmentConfigs: [],     // loaded client-side from compartmentConfig.ts
    displaySettings: { hideItemNamesOnPhone: false, hideDescriptions: false },
    alertThresholds: alertThresholdRows,
    pendingChanges: 0,
    trips: assembledTrips,
    groceryLists: assembledGroceryLists,
    stockBatches: stockBatchRows,
    activityLog: activityLogRows,
    storageLocations: storageLocationRows,
  });
});

export { state };
