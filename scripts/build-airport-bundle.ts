/**
 * Builds the static airport reference bundle from an extracted FAA NASR 28-day
 * CSV bundle (D45, D48).
 *
 *   npm run airport:build-bundle -- /path/to/extracted/APT_CSV
 *
 * Why a build script and not an API route: the reference layer is read-only,
 * public-domain data that changes on a 28-day cycle. Serving it would make the
 * airport page depend on the API, which today returns 500 in production and
 * cannot run locally at all (TL-18, TL-15). A static asset has neither problem.
 * See D48 for the trade-off, including the fact that refresh is now a build step
 * rather than a cron.
 *
 * Output, written to public/airport-data/:
 *   index.json            — the search index, loaded eagerly
 *   airports/<ARPT_ID>.json — per-airport detail, fetched on demand
 *
 * Keyed on ARPT_ID (the FAA location identifier) rather than ICAO: 30% of
 * qualifying airports have no ICAO id at all, and NASR's own key, SITE_NO, is
 * not unique without SITE_TYPE_CODE.
 *
 * All parsing is by header NAME. FAA Data Product Notice 26-01 changes the
 * fixed-width layout on the 03 Sep 2026 cycle; header-keyed reads are unaffected.
 */

import { createReadStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parse } from 'csv-parse';

import { airportFacts } from '../src/airport/flags/rules';
import { resolveRunwayPavement } from '../src/airport/nasr/pavement';
import { isPublishableRunway, parseDeclaredDistances } from '../src/airport/nasr/runway';
import type {
  AirportIndexEntry,
  AirportRecord,
  RunwayRecord,
} from '../src/airport/types';

type Row = Record<string, string>;

const OUTPUT_DIR = path.resolve('public/airport-data');

/** SITE_NO alone is not unique — 23747.31 is both an airport and a heliport. */
function siteKey(row: Row): string {
  return `${row.SITE_NO}|${row.SITE_TYPE_CODE}`;
}

async function readCsv(file: string): Promise<Row[]> {
  const rows: Row[] = [];
  const parser = createReadStream(file).pipe(
    // NASR ships UTF-8 with a BOM and uses empty strings, never NULL.
    parse({ columns: true, bom: true, skip_empty_lines: true, relax_column_count: true }),
  );
  for await (const row of parser) rows.push(row as Row);
  return rows;
}

function groupBy(rows: Row[], key: (row: Row) => string): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = grouped.get(k);
    if (bucket) bucket.push(row);
    else grouped.set(k, [row]);
  }
  return grouped;
}

function num(value: string | undefined): number | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function str(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed || null;
}

function list(value: string | undefined): string[] {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed.split(',').map((part) => part.trim()).filter(Boolean) : [];
}

function buildRunways(runwayRows: Row[], endRows: Row[], remarkRows: Row[]): RunwayRecord[] {
  const endsByRunway = groupBy(endRows, (row) => row.RWY_ID);
  const remarksByElement = groupBy(remarkRows, (row) => row.ELEMENT ?? '');

  return runwayRows
    .filter((row) =>
      isPublishableRunway({
        rwyId: row.RWY_ID,
        rwyLen: row.RWY_LEN,
        surfaceTypeCode: row.SURFACE_TYPE_CODE,
      }),
    )
    .map((row) => ({
      runwayId: row.RWY_ID,
      lengthFt: num(row.RWY_LEN),
      widthFt: num(row.RWY_WIDTH),
      surfaceTypeCode: str(row.SURFACE_TYPE_CODE),
      condition: str(row.COND),
      treatmentCode: str(row.TREATMENT_CODE),
      lightingCode: str(row.RWY_LGT_CODE),
      pavement: resolveRunwayPavement({
        pcn: row.PCN ?? '',
        pavementTypeCode: row.PAVEMENT_TYPE_CODE ?? '',
        subgradeStrengthCode: row.SUBGRADE_STRENGTH_CODE ?? '',
        tirePresCode: row.TIRE_PRES_CODE ?? '',
        dtrmMethodCode: row.DTRM_METHOD_CODE ?? '',
        grossWtSw: row.GROSS_WT_SW ?? '',
        grossWtDw: row.GROSS_WT_DW ?? '',
        grossWtDtw: row.GROSS_WT_DTW ?? '',
        grossWtDdtw: row.GROSS_WT_DDTW ?? '',
        pcnRemarks: (remarksByElement.get(row.RWY_ID) ?? []).map((remark) => remark.REMARK),
      }),
      ends: (endsByRunway.get(row.RWY_ID) ?? []).map((end) => ({
        endId: end.RWY_END_ID,
        trueAlignmentDeg: num(end.TRUE_ALIGNMENT),
        elevationFt: num(end.RWY_END_ELEV),
        displacedThresholdFt: num(end.DISPLACED_THR_LEN),
        gradientPct: num(end.RWY_GRAD),
        approachLightingCode: str(end.APCH_LGT_SYSTEM_CODE),
        ilsType: str(end.ILS_TYPE),
        markingTypeCode: str(end.RWY_MARKING_TYPE_CODE),
        declaredDistances: parseDeclaredDistances({
          tkofRunAvbl: end.TKOF_RUN_AVBL ?? '',
          tkofDistAvbl: end.TKOF_DIST_AVBL ?? '',
          acltStopDistAvbl: end.ACLT_STOP_DIST_AVBL ?? '',
          lndgDistAvbl: end.LNDG_DIST_AVBL ?? '',
        }),
      })),
    }));
}

function buildAirport(
  base: Row,
  runways: RunwayRecord[],
  attendanceRows: Row[],
  contactRows: Row[],
): AirportRecord {
  return {
    id: base.ARPT_ID,
    icaoId: str(base.ICAO_ID),
    siteNo: base.SITE_NO,
    siteTypeCode: base.SITE_TYPE_CODE,
    name: base.ARPT_NAME,
    city: str(base.CITY),
    stateCode: str(base.STATE_CODE),
    countyName: str(base.COUNTY_NAME),
    countryCode: str(base.COUNTRY_CODE),
    latitude: num(base.LAT_DECIMAL),
    longitude: num(base.LONG_DECIMAL),
    elevationFt: num(base.ELEV),
    magneticVariation: str(base.MAG_VARN) ? `${base.MAG_VARN}${str(base.MAG_HEMIS) ?? ''}` : null,
    trafficPatternAltitudeFt: num(base.TPA),
    status: str(base.ARPT_STATUS),
    ownershipTypeCode: str(base.OWNERSHIP_TYPE_CODE),
    facilityUseCode: str(base.FACILITY_USE_CODE),
    towerTypeCode: str(base.TWR_TYPE_CODE),
    artccId: str(base.RESP_ARTCC_ID),
    notamId: str(base.NOTAM_ID),
    notamDFlag: str(base.NOTAM_FLAG) === 'Y',
    customsAvailable: str(base.CUST_FLAG) === 'Y',
    landingRightsAvailable: str(base.LNDG_RIGHTS_FLAG) === 'Y',
    landingFee: str(base.LNDG_FEE_FLAG) === 'Y',
    far139TypeCode: str(base.FAR_139_TYPE_CODE),
    fuelTypes: list(base.FUEL_TYPES),
    otherServices: list(base.OTHER_SERVICES),
    contractFuelAvailable: str(base.CONTR_FUEL_AVBL),
    airportLightingSchedule: str(base.LGT_SKED),
    beaconLightingSchedule: str(base.BCN_LGT_SKED),
    lastInspection: str(base.LAST_INSPECTION),
    runways,
    attendance: attendanceRows.map((row) => ({
      month: row.MONTH,
      day: row.DAY,
      hour: row.HOUR,
    })),
    contacts: contactRows.map((row) => ({
      title: str(row.TITLE),
      name: str(row.NAME),
      phone: str(row.PHONE_NO),
      city: str(row.TITLE_CITY),
      state: str(row.STATE),
    })),
    effectiveDate: base.EFF_DATE,
  };
}

async function main(): Promise<void> {
  const sourceDir = process.argv[2];
  if (!sourceDir) {
    console.error(
      'usage: npm run airport:build-bundle -- <path to extracted NASR APT CSV directory>',
    );
    process.exit(1);
  }

  const at = (file: string) => path.join(sourceDir, file);

  console.log('reading NASR CSVs…');
  const [baseRows, runwayRows, endRows, attendanceRows, contactRows, remarkRows] =
    await Promise.all([
      readCsv(at('APT_BASE.csv')),
      readCsv(at('APT_RWY.csv')),
      readCsv(at('APT_RWY_END.csv')),
      readCsv(at('APT_ATT.csv')),
      readCsv(at('APT_CON.csv')),
      readCsv(at('APT_RMK.csv')),
    ]);

  const runwaysBySite = groupBy(runwayRows, siteKey);
  const endsBySite = groupBy(endRows, siteKey);
  const attendanceBySite = groupBy(attendanceRows, siteKey);
  const contactsBySite = groupBy(contactRows, siteKey);
  const pavementRemarksBySite = groupBy(
    remarkRows.filter((row) => row.REF_COL_NAME === 'PCN' && row.TAB_NAME === 'RUNWAY'),
    siteKey,
  );

  const index: AirportIndexEntry[] = [];
  const records: AirportRecord[] = [];

  for (const base of baseRows) {
    const key = siteKey(base);
    const runways = buildRunways(
      runwaysBySite.get(key) ?? [],
      endsBySite.get(key) ?? [],
      pavementRemarksBySite.get(key) ?? [],
    );

    // D45's cut: an airport earns a place only if it still has a qualifying
    // runway after the length and hard-surface filters.
    if (runways.length === 0) continue;

    const record = buildAirport(
      base,
      runways,
      attendanceBySite.get(key) ?? [],
      contactsBySite.get(key) ?? [],
    );
    records.push(record);
    index.push({
      id: record.id,
      icaoId: record.icaoId,
      name: record.name,
      city: record.city,
      stateCode: record.stateCode,
      latitude: record.latitude,
      longitude: record.longitude,
      longestRunwayFt: Math.max(...runways.map((runway) => runway.lengthFt ?? 0)),
    });
  }

  index.sort((a, b) => a.id.localeCompare(b.id));

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(path.join(OUTPUT_DIR, 'airports'), { recursive: true });

  const effectiveDate = records[0]?.effectiveDate ?? 'unknown';
  await writeFile(
    path.join(OUTPUT_DIR, 'index.json'),
    JSON.stringify({ effectiveDate, count: index.length, airports: index }),
  );

  // Derived facts for every airport in one file, so the flag rule builder can
  // show a live match count across the whole set (D50) without fetching 2,128
  // detail files, and so flag evaluation on the pilot workspace stays cheap.
  await writeFile(
    path.join(OUTPUT_DIR, 'facts.json'),
    JSON.stringify({
      effectiveDate,
      facts: Object.fromEntries(records.map((record) => [record.id, airportFacts(record)])),
    }),
  );
  await Promise.all(
    records.map((record) =>
      writeFile(
        path.join(OUTPUT_DIR, 'airports', `${record.id}.json`),
        JSON.stringify(record),
      ),
    ),
  );

  const withIcao = records.filter((record) => record.icaoId).length;
  const withDistances = records.filter((record) =>
    record.runways.some((runway) => runway.ends.some((end) => end.declaredDistances)),
  ).length;
  const withPavement = records.filter((record) =>
    record.runways.some((runway) => runway.pavement.classification),
  ).length;

  console.log(`cycle ${effectiveDate}`);
  console.log(`${records.length} airports written to ${OUTPUT_DIR}`);
  console.log(`  with ICAO id ............ ${withIcao}`);
  console.log(`  with declared distances . ${withDistances}`);
  console.log(`  with pavement strength .. ${withPavement}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
