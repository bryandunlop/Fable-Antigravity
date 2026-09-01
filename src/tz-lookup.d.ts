/**
 * `tz-lookup` ships no types (it is a generated single file, CC0). One function, one signature.
 * Throws a RangeError on a coordinate outside [-90,90] / [-180,180].
 */
declare module 'tz-lookup' {
  export default function tzLookup(latitude: number, longitude: number): string;
}
