import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { TrendingDown, TrendingUp, Plane, User } from 'lucide-react';
import { FuelingRecord } from './types';

interface RecordTableProps {
  records: FuelingRecord[];
  showTailNumber?: boolean;
  limit?: number;
}

export default function RecordTable({ records, showTailNumber = true, limit }: RecordTableProps) {
  const displayRecords = limit ? records.slice(0, limit) : records;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date/Time</TableHead>
          <TableHead>Type</TableHead>
          {showTailNumber && <TableHead>Tail Number</TableHead>}
          <TableHead>Start/End Gallons</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Technician</TableHead>
          <TableHead>Running Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayRecords.map((record) => (
          <TableRow key={record.id}>
            <TableCell>
              <div>
                <div>{new Date(record.dateTime).toLocaleDateString()}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(record.dateTime).toLocaleTimeString()}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge 
                variant="outline" 
                className={record.type === 'dispensed' ? 'text-red-600' : 'text-green-600'}
              >
                {record.type === 'dispensed' ? (
                  <>
                    <TrendingDown className="w-3 h-3 mr-1" />
                    Dispensed
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Added
                  </>
                )}
              </Badge>
            </TableCell>
            {showTailNumber && (
              <TableCell>
                {record.tailNumber ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Plane className="w-3 h-3" />
                    {record.tailNumber}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            )}
            <TableCell>
              <div className="text-xs">
                {record.startingGallons.toLocaleString()} → {record.endingGallons.toLocaleString()}
              </div>
            </TableCell>
            <TableCell>
              <span className={record.type === 'dispensed' ? 'text-red-600' : 'text-green-600'}>
                {record.type === 'dispensed' ? '-' : '+'}{record.gallonsChanged.toLocaleString()} gal
              </span>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {record.technician}
              </div>
            </TableCell>
            <TableCell>
              <span>{record.currentTotal.toLocaleString()} gal</span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}