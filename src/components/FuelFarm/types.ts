export interface FuelingRecord {
  id: string;
  type: 'dispensed' | 'replenished';
  tailNumber?: string;
  startingGallons: number;
  endingGallons: number;
  gallonsChanged: number;
  dateTime: string;
  technician: string;
  notes?: string;
  fuelType: string;
  currentTotal: number;
}

export interface FuelFarmStatus {
  totalCapacity: number;
  currentLevel: number;
  lastUpdated: string;
  fuelType: string;
}

export interface NewRecordForm {
  tailNumber: string;
  startingGallons: string;
  endingGallons: string;
  technician: string;
  notes: string;
  fuelType: string;
}

export interface FuelStatusInfo {
  status: 'critical' | 'low' | 'medium' | 'good';
  color: string;
  bgColor: string;
}