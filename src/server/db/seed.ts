import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' }); // ensure .env.local loads even if NODE_ENV isn't set

import { createDb } from './index';
import * as schema from './schema';
import {
  ITEMS_V2, MOCK_INSPECTIONS, STOCKROOMS, STOCKROOM_ITEMS,
  MOCK_PICK_LIST, MOCK_RESTOCK_LIST, MOCK_UNIT_REQUESTS,
  STOCK_BATCHES, STORAGE_LOCATIONS,
} from '../../components/inventory-v2/mockData';
import { MOCK_TRIPS, MOCK_GROCERY_LISTS } from '../../components/inventory-v2/mockTrips';
import { FLEET_V2 } from '../../components/inventory-v2/constants';
import { SYSTEM_USERS } from '../../lib/mockUsers';

async function seed() {
  const db = createDb();
  console.log('Seeding database...');

  // 1. Users
  console.log('  Users...');
  for (const u of SYSTEM_USERS) {
    await db.insert(schema.users).values({
      id: u.id,
      name: u.name,
      email: u.email,
      roles: u.roles,
      department: u.department,
      status: u.status ?? 'Active',
    }).onConflictDoNothing();
  }

  // 2. Fleet
  console.log('  Fleet...');
  for (const f of FLEET_V2) {
    await db.insert(schema.fleet).values({
      tailNumber: f.tailNumber,
      type: f.type,
      displayName: f.displayName,
    }).onConflictDoNothing();
  }

  // 3. Stockrooms
  console.log('  Stockrooms...');
  for (const s of STOCKROOMS) {
    await db.insert(schema.stockrooms).values({
      id: s.id,
      name: s.name,
      location: s.location,
    }).onConflictDoNothing();
  }

  // 3b. Storage Locations
  console.log('  Storage locations...');
  for (const loc of STORAGE_LOCATIONS) {
    await db.insert(schema.storageLocations).values({
      id: loc.id,
      name: loc.name,
      type: loc.type,
      sortOrder: loc.sortOrder,
    }).onConflictDoNothing();
  }

  // 4. Items
  console.log('  Items...');
  for (const item of ITEMS_V2) {
    await db.insert(schema.items).values({
      id: item.id,
      itemName: item.itemName,
      description: item.description ?? null,
      category: item.category,
      supplyCategory: item.supplyCategory,
      compartmentId: item.compartmentId,
      location: item.location,
      uom: item.uom,
      vendorItemNumber: item.vendorItemNumber ?? null,
      internalItemNumber: item.internalItemNumber ?? null,
      thumbnailUrl: item.thumbnailUrl ?? null,
      costPerUnit: item.costPerUnit ?? null,
      defaultQuantities: item.defaultQuantities,
      alternateNames: item.alternateNames,
      reorderUrl: item.reorderUrl ?? null,
      barcode: item.barcode ?? null,
      isConsumable: item.isConsumable ?? null,
      posCategory: item.posCategory ?? null,
      vendor: item.vendor ?? null,
    }).onConflictDoNothing();
  }

  // 5. Stockroom Items
  console.log('  Stockroom items...');
  for (const si of STOCKROOM_ITEMS) {
    await db.insert(schema.stockroomItems).values({
      itemId: si.itemId,
      stockroomId: si.stockroomId,
      qtyOnHand: si.qtyOnHand,
      parLevel: si.parLevel,
      minimumLevel: si.minimumLevel,
      binLocation: si.binLocation,
      locationId: si.locationId ?? null,
    }).onConflictDoNothing();
  }

  // 6. Inspections
  console.log('  Inspections...');
  for (const insp of MOCK_INSPECTIONS) {
    await db.insert(schema.inspections).values({
      id: insp.id,
      tailNumber: insp.tailNumber,
      aircraftType: insp.aircraftType,
      date: insp.date,
      reportedBy: insp.reportedBy,
      reservationId: insp.reservationId ?? null,
      status: insp.status,
      checkedItems: insp.checkedItems,
      topLevelNotes: insp.topLevelNotes,
      photos: insp.photos,
      additionalFees: insp.additionalFees,
      missingItemCharges: insp.missingItemCharges,
      readinessScore: insp.readinessScore,
      submittedAt: insp.submittedAt ?? null,
    }).onConflictDoNothing();
  }

  // 7. Pick list items
  console.log('  Pick list items...');
  for (const pl of MOCK_PICK_LIST) {
    await db.insert(schema.pickListItems).values({
      id: pl.id,
      inspectionId: pl.inspectionId,
      unitTailNumber: pl.unitTailNumber,
      itemId: pl.itemId,
      qtyNeeded: pl.qtyNeeded,
      qtyTaken: pl.qtyTaken,
      done: pl.done,
    }).onConflictDoNothing();
  }

  // 8. Restock list items
  console.log('  Restock list items...');
  for (const rl of MOCK_RESTOCK_LIST) {
    await db.insert(schema.restockListItems).values({
      id: rl.id,
      inspectionId: rl.inspectionId,
      unitTailNumber: rl.unitTailNumber,
      itemId: rl.itemId,
      qtyPicked: rl.qtyPicked,
      qtyNeeded: rl.qtyNeeded,
      done: rl.done,
      cancelled: rl.cancelled,
    }).onConflictDoNothing();
  }

  // 9. Unit item requests
  console.log('  Unit item requests...');
  for (const req of MOCK_UNIT_REQUESTS) {
    await db.insert(schema.unitItemRequests).values({
      id: req.id,
      unitTailNumber: req.unitTailNumber,
      isGuestRequest: req.isGuestRequest,
      notes: req.notes,
      status: req.status,
      requestedBy: req.requestedBy,
      requestDate: req.requestDate,
      items: req.items,
    }).onConflictDoNothing();
  }

  // 10. Stock batches
  console.log('  Stock batches...');
  for (const sb of STOCK_BATCHES) {
    await db.insert(schema.stockBatches).values({
      id: sb.id,
      itemId: sb.itemId,
      stockroomId: sb.stockroomId,
      quantity: sb.quantity,
      expirationDate: sb.expirationDate ?? null,
      receivedDate: sb.receivedDate,
      batchLabel: sb.batchLabel ?? null,
    }).onConflictDoNothing();
  }

  // 11. Trips (+ legs + usage + notes + load + return)
  console.log('  Trips...');
  for (const trip of MOCK_TRIPS) {
    await db.insert(schema.trips).values({
      id: trip.id,
      tailNumber: trip.tailNumber,
      aircraftType: trip.aircraftType,
      tripName: trip.tripName ?? null,
      tripNumber: trip.tripNumber ?? null,
      status: trip.status,
      startDate: trip.startDate,
      endDate: trip.endDate ?? null,
      createdBy: trip.createdBy,
      createdAt: trip.createdAt,
      baselineConfirmedAt: trip.baselineConfirmedAt ?? null,
      lastEditedBy: trip.lastEditedBy ?? null,
      lastEditedAt: trip.lastEditedAt ?? null,
    }).onConflictDoNothing();

    for (const leg of trip.legs) {
      await db.insert(schema.tripLegs).values({
        id: leg.id,
        tripId: trip.id,
        legNumber: leg.legNumber,
        origin: leg.origin,
        destination: leg.destination,
        date: leg.date,
        paxCount: leg.paxCount,
        status: leg.status,
        phase: leg.phase,
        groceryListId: leg.groceryListId ?? null,
      }).onConflictDoNothing();

      for (const entry of leg.usageLog) {
        await db.insert(schema.usageLogEntries).values({
          id: entry.id,
          legId: leg.id,
          itemId: entry.itemId,
          qtyUsed: entry.qtyUsed,
          loggedBy: entry.loggedBy,
          loggedAt: entry.loggedAt,
        }).onConflictDoNothing();
      }

      for (const note of leg.notes) {
        await db.insert(schema.tripNotes).values({
          id: note.id,
          tripId: trip.id,
          legId: leg.id,
          text: note.text,
          author: note.author,
          createdAt: note.createdAt,
        }).onConflictDoNothing();
      }
    }

    for (const note of trip.notes) {
      await db.insert(schema.tripNotes).values({
        id: note.id,
        tripId: trip.id,
        legId: note.legId ?? null,
        text: note.text,
        author: note.author,
        createdAt: note.createdAt,
      }).onConflictDoNothing();
    }

    for (const li of trip.loadItems) {
      await db.insert(schema.tripLoadItems).values({
        id: li.id,
        tripId: trip.id,
        itemId: li.itemId,
        qty: li.qty,
        source: li.source,
        loadedBy: li.loadedBy,
        loadedAt: li.loadedAt,
        legId: li.legId ?? null,
      }).onConflictDoNothing();
    }

    for (const ri of trip.returnItems) {
      await db.insert(schema.tripReturnItems).values({
        id: ri.id,
        tripId: trip.id,
        itemId: ri.itemId,
        qty: ri.qty,
        returnedBy: ri.returnedBy,
        returnedAt: ri.returnedAt,
      }).onConflictDoNothing();
    }
  }

  // 12. Grocery lists
  console.log('  Grocery lists...');
  for (const gl of MOCK_GROCERY_LISTS) {
    await db.insert(schema.groceryLists).values({
      id: gl.id,
      tripId: gl.tripId,
      legId: gl.legId ?? null,
      tailNumber: gl.tailNumber,
      status: gl.status,
      generatedAt: gl.generatedAt,
      generatedBy: gl.generatedBy,
      notes: gl.notes ?? null,
    }).onConflictDoNothing();

    for (const item of gl.items) {
      await db.insert(schema.groceryListItems).values({
        id: item.id,
        groceryListId: gl.id,
        itemId: item.itemId,
        qtyNeeded: item.qtyNeeded,
        qtyFulfilled: item.qtyFulfilled,
        isManual: item.isManual ?? false,
        manualItemName: item.manualItemName ?? null,
      }).onConflictDoNothing();
    }
  }

  console.log('Seed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
