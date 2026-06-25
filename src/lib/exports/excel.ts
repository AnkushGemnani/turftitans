import * as XLSX from "xlsx";

export type ExcelExportData = {
  summary: any[][];
  teams: any[][];
  players: any[][];
  auction: any[][];
  payments: any[][];
};

export function exportToExcel(data: ExcelExportData, filename: string) {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Helper to append sheet if data exists
  function addSheet(sheetData: any[][], name: string) {
    // If empty or only headers, ensure we have at least headers
    const formattedData = sheetData.length > 0 ? sheetData : [["No records available"]];
    const ws = XLSX.utils.aoa_to_sheet(formattedData);
    
    // Set basic column widths for readability
    const maxCols = Math.max(...formattedData.map(r => r.length), 0);
    const cols = [];
    for (let i = 0; i < maxCols; i++) {
      cols.push({ wch: 20 }); // Set width of each column to 20 characters
    }
    ws["!cols"] = cols;

    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  // 1. Tournament Summary tab
  addSheet(data.summary, "Tournament Summary");

  // 2. Teams tab
  addSheet(data.teams, "Teams");

  // 3. Players tab
  addSheet(data.players, "Players");

  // 4. Auction Results tab
  addSheet(data.auction, "Auction Results");

  // 5. Payments tab
  addSheet(data.payments, "Payments");

  // Write workbook to file (triggers automatic browser download)
  XLSX.writeFile(wb, filename);
}
