import { describe, it, expect } from 'vitest';
import { countryForIcao } from './geo';

describe('countryForIcao', () => {
  it('maps covered prefixes to their country/region code', () => {
    expect(countryForIcao('KLUK')).toBe('US');
    expect(countryForIcao('CYYZ')).toBe('CA');
    expect(countryForIcao('ZBAA')).toBe('CN');
    expect(countryForIcao('EGLL')).toBe('GB');
    expect(countryForIcao('WSSS')).toBe('SG');
    expect(countryForIcao('RPLL')).toBe('PH');
    expect(countryForIcao('MMMX')).toBe('MX');
    expect(countryForIcao('VIDP')).toBe('IN');
    expect(countryForIcao('LFPG')).toBe('EU');
  });

  it('falls back to OTHER:<prefix> for uncovered ICAOs', () => {
    expect(countryForIcao('SBGR')).toBe('OTHER:SB');
  });

  it('uppercases the input before matching', () => {
    expect(countryForIcao('kluk')).toBe('US');
    expect(countryForIcao('zbaa')).toBe('CN');
    expect(countryForIcao('egll')).toBe('GB');
    expect(countryForIcao('sbgr')).toBe('OTHER:SB');
  });

  it('checks two-letter prefixes before single-letter ones', () => {
    expect(countryForIcao('MMMX')).toBe('MX'); // not matched by single-letter 'M'
    expect(countryForIcao('EGLL')).toBe('GB'); // not matched by single-letter 'E'
    expect(countryForIcao('WSSS')).toBe('SG');
    expect(countryForIcao('RPLL')).toBe('PH');
    expect(countryForIcao('ZBAA')).toBe('CN');
  });

  it('maps additional China, Europe, and India prefixes', () => {
    expect(countryForIcao('ZGGG')).toBe('CN');
    expect(countryForIcao('ZSPD')).toBe('CN');
    expect(countryForIcao('ZUUU')).toBe('CN');
    expect(countryForIcao('ZPPP')).toBe('CN');
    expect(countryForIcao('ZLXY')).toBe('CN');
    expect(countryForIcao('ZHHH')).toBe('CN');
    expect(countryForIcao('ZYHB')).toBe('CN');
    expect(countryForIcao('ZWWW')).toBe('CN');
    expect(countryForIcao('ZJHK')).toBe('CN');
    expect(countryForIcao('LEMD')).toBe('EU');
    expect(countryForIcao('LIRF')).toBe('EU');
    expect(countryForIcao('LGAV')).toBe('EU');
    expect(countryForIcao('VABB')).toBe('IN');
    expect(countryForIcao('VECC')).toBe('IN');
    expect(countryForIcao('VOMM')).toBe('IN');
  });

  it('maps single-letter US/Canada prefixes', () => {
    expect(countryForIcao('KASE')).toBe('US');
    expect(countryForIcao('CYUL')).toBe('CA');
  });
});
