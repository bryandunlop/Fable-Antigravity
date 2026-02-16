import { FuelingRecord, FuelFarmStatus, FuelStatusInfo } from './types';

export const getFuelLevelStatus = (fuelFarmStatus: FuelFarmStatus): FuelStatusInfo => {
  const percentage = (fuelFarmStatus.currentLevel / fuelFarmStatus.totalCapacity) * 100;
  if (percentage < 20) return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-100' };
  if (percentage < 40) return { status: 'low', color: 'text-orange-600', bgColor: 'bg-orange-100' };
  if (percentage < 70) return { status: 'medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
  return { status: 'good', color: 'text-green-600', bgColor: 'bg-green-100' };
};

export const calculateGallonsChanged = (startingGallons: string, endingGallons: string): number => {
  const start = parseFloat(startingGallons);
  const end = parseFloat(endingGallons);
  if (!isNaN(start) && !isNaN(end)) {
    return Math.abs(end - start);
  }
  return 0;
};

export const validateFuelRecord = (
  recordType: 'dispensed' | 'replenished',
  startGal: number,
  endGal: number,
  tailNumber: string,
  totalCapacity: number
): string | null => {
  if (recordType === 'dispensed' && !tailNumber) {
    return 'Tail number is required for aircraft fueling';
  }

  if (recordType === 'replenished' && endGal > totalCapacity) {
    return 'Ending gallons exceed fuel farm capacity';
  }

  if (recordType === 'dispensed' && endGal > startGal) {
    return 'Ending gallons should be less than starting gallons when dispensing fuel';
  }

  if (recordType === 'replenished' && endGal < startGal) {
    return 'Ending gallons should be more than starting gallons when adding fuel';
  }

  return null;
};

export const getTodayRecords = (records: FuelingRecord[]): FuelingRecord[] => {
  return records.filter(record => 
    new Date(record.dateTime).toDateString() === new Date().toDateString()
  );
};

export const calculateTodayDispensed = (records: FuelingRecord[]): number => {
  return getTodayRecords(records)
    .filter(record => record.type === 'dispensed')
    .reduce((sum, record) => sum + record.gallonsChanged, 0);
};

export const calculateTodayReplenished = (records: FuelingRecord[]): number => {
  return getTodayRecords(records)
    .filter(record => record.type === 'replenished')
    .reduce((sum, record) => sum + record.gallonsChanged, 0);
};