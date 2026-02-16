import { FuelingRecord } from './types';

export const FUEL_TYPES = [
  { value: 'Jet A-1', label: 'Jet A-1' },
  { value: 'Jet A', label: 'Jet A' },
  { value: '100LL', label: '100LL' }
];

export const TECHNICIANS = [
  { value: 'Mike Johnson', label: 'Mike Johnson' },
  { value: 'Sarah Wilson', label: 'Sarah Wilson' },
  { value: 'Tom Rodriguez', label: 'Tom Rodriguez' },
  { value: 'Lisa Chen', label: 'Lisa Chen' },
  { value: 'David Kim', label: 'David Kim' }
];

export const MOCK_RECORDS: FuelingRecord[] = [
  {
    id: '1',
    type: 'dispensed',
    tailNumber: 'N123AB',
    startingGallons: 8000,
    endingGallons: 7650,
    gallonsChanged: 350,
    dateTime: '2024-02-05T09:30:00',
    technician: 'Mike Johnson',
    notes: 'Routine refueling',
    fuelType: 'Jet A-1',
    currentTotal: 7650
  },
  {
    id: '2',
    type: 'replenished',
    startingGallons: 7650,
    endingGallons: 9650,
    gallonsChanged: 2000,
    dateTime: '2024-02-05T14:15:00',
    technician: 'Sarah Wilson',
    notes: 'Fuel delivery from Shell Aviation',
    fuelType: 'Jet A-1',
    currentTotal: 9650
  },
  {
    id: '3',
    type: 'dispensed',
    tailNumber: 'N456CD',
    startingGallons: 9650,
    endingGallons: 9200,
    gallonsChanged: 450,
    dateTime: '2024-02-06T08:45:00',
    technician: 'Tom Rodriguez',
    notes: 'Full fuel load for long-range flight',
    fuelType: 'Jet A-1',
    currentTotal: 9200
  },
  {
    id: '4',
    type: 'dispensed',
    tailNumber: 'N789EF',
    startingGallons: 9200,
    endingGallons: 8950,
    gallonsChanged: 250,
    dateTime: '2024-02-06T11:20:00',
    technician: 'Mike Johnson',
    fuelType: 'Jet A-1',
    currentTotal: 8950
  },
  {
    id: '5',
    type: 'dispensed',
    tailNumber: 'N234GH',
    startingGallons: 8950,
    endingGallons: 8550,
    gallonsChanged: 400,
    dateTime: '2024-02-06T16:30:00',
    technician: 'Lisa Chen',
    notes: 'Pre-flight fuel check completed',
    fuelType: 'Jet A-1',
    currentTotal: 8550
  }
];