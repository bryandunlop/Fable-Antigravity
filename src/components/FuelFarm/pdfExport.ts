import { FuelingRecord, FuelFarmStatus } from './types';

// PDF export utility using browser's built-in functionality
export const generateMonthlyReport = (records: FuelingRecord[], fuelFarmStatus: FuelFarmStatus, month: string, year: string) => {
  const monthRecords = records.filter(record => {
    const recordDate = new Date(record.dateTime);
    return recordDate.getMonth() === parseInt(month) - 1 && recordDate.getFullYear() === parseInt(year);
  });

  const dispensedRecords = monthRecords.filter(r => r.type === 'dispensed');
  const replenishedRecords = monthRecords.filter(r => r.type === 'replenished');
  
  const totalDispensed = dispensedRecords.reduce((sum, r) => sum + r.gallonsChanged, 0);
  const totalReplenished = replenishedRecords.reduce((sum, r) => sum + r.gallonsChanged, 0);
  
  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long' });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fuel Farm Monthly Report - ${monthName} ${year}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #030213; padding-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #030213; }
        .summary-card .value { font-size: 24px; font-weight: bold; }
        .dispensed { color: #dc2626; }
        .replenished { color: #16a34a; }
        .current { color: #2563eb; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .type-dispensed { color: #dc2626; font-weight: bold; }
        .type-replenished { color: #16a34a; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Fuel Farm Monthly Report</h1>
        <h2>${monthName} ${year}</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="summary">
        <div class="summary-card">
          <h3>Current Fuel Level</h3>
          <div class="value current">${fuelFarmStatus.currentLevel.toLocaleString()} gal</div>
          <p>${((fuelFarmStatus.currentLevel / fuelFarmStatus.totalCapacity) * 100).toFixed(1)}% of capacity</p>
        </div>
        <div class="summary-card">
          <h3>Total Dispensed</h3>
          <div class="value dispensed">${totalDispensed.toLocaleString()} gal</div>
          <p>${dispensedRecords.length} operations</p>
        </div>
        <div class="summary-card">
          <h3>Total Replenished</h3>
          <div class="value replenished">${totalReplenished.toLocaleString()} gal</div>
          <p>${replenishedRecords.length} deliveries</p>
        </div>
        <div class="summary-card">
          <h3>Net Change</h3>
          <div class="value ${totalReplenished - totalDispensed >= 0 ? 'replenished' : 'dispensed'}">
            ${totalReplenished - totalDispensed >= 0 ? '+' : ''}${(totalReplenished - totalDispensed).toLocaleString()} gal
          </div>
          <p>${monthRecords.length} total transactions</p>
        </div>
      </div>

      <h3>Aircraft Fueling Operations</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Tail Number</th>
            <th>Gallons Dispensed</th>
            <th>Technician</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${dispensedRecords.map(record => `
            <tr>
              <td>${new Date(record.dateTime).toLocaleDateString()}</td>
              <td>${new Date(record.dateTime).toLocaleTimeString()}</td>
              <td>${record.tailNumber || '-'}</td>
              <td class="type-dispensed">${record.gallonsChanged.toLocaleString()} gal</td>
              <td>${record.technician}</td>
              <td>${record.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h3>Fuel Farm Replenishments</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Gallons Added</th>
            <th>Previous Level</th>
            <th>New Level</th>
            <th>Technician</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${replenishedRecords.map(record => `
            <tr>
              <td>${new Date(record.dateTime).toLocaleDateString()}</td>
              <td>${new Date(record.dateTime).toLocaleTimeString()}</td>
              <td class="type-replenished">${record.gallonsChanged.toLocaleString()} gal</td>
              <td>${record.startingGallons.toLocaleString()} gal</td>
              <td>${record.endingGallons.toLocaleString()} gal</td>
              <td>${record.technician}</td>
              <td>${record.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>This report was automatically generated from the Fuel Farm Tracking System</p>
        <p>Report contains ${monthRecords.length} total transactions for ${monthName} ${year}</p>
      </div>
    </body>
    </html>
  `;

  // Create and download the PDF-ready HTML file
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fuel-farm-report-${year}-${month.padStart(2, '0')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Also open in new window for printing to PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
};

export const getAvailableMonths = (records: FuelingRecord[]) => {
  const months = new Set<string>();
  records.forEach(record => {
    const date = new Date(record.dateTime);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    months.add(monthYear);
  });
  return Array.from(months).sort().reverse();
};