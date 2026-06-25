import jsPDF from "jspdf";

export type PDFExportOptions = {
  tournamentName: string;
  reportTitle: string;
  headers: string[];
  rows: string[][];
  filename: string;
};

export function exportToPDF({
  tournamentName,
  reportTitle,
  headers,
  rows,
  filename,
}: PDFExportOptions) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  let y = margin;

  // Render Header (Branding & Title)
  function renderHeader(pageNum: number) {
    // Top Accent Bar (TurfTitans Green)
    doc.setFillColor(16, 185, 129); // #10b981
    doc.rect(0, 0, pageWidth, 8, "F");

    y = 20;

    // TurfTitans logo branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text("TURFTITANS", margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    const dateStr = `Generated on: ${new Date().toLocaleString("en-IN")}`;
    doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), y);

    y += 10;

    // Tournament Name & Report Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(tournamentName, margin, y);

    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(reportTitle, margin, y);

    // Decorative line
    y += 5;
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    y += 8;
  }

  // Render Footer (Page numbers)
  function renderFooter(pageNum: number, totalPages: number) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    const footerText = `Page ${pageNum} of ${totalPages}`;
    doc.text(
      footerText,
      pageWidth / 2 - doc.getTextWidth(footerText) / 2,
      pageHeight - 10
    );
  }

  // Draw table helper
  function drawTable(tableHeaders: string[], tableRows: string[][]) {
    const colWidth = contentWidth / tableHeaders.length;
    
    // Header Row Background
    doc.setFillColor(15, 23, 42); // Dark slate
    doc.rect(margin, y, contentWidth, 8, "F");

    // Header Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    
    tableHeaders.forEach((header, index) => {
      const textX = margin + index * colWidth + 2;
      const textY = y + 5.5;
      // Truncate header if too long
      const truncated = doc.splitTextToSize(header, colWidth - 4)[0] || "";
      doc.text(truncated, textX, textY);
    });

    y += 8;

    // Rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);

    tableRows.forEach((row, rowIndex) => {
      // Check page break
      if (y > pageHeight - 20) {
        doc.addPage();
        y = margin;
        renderHeader(doc.internal.pages.length - 1);
        
        // Redraw table headers on new page
        doc.setFillColor(15, 23, 42);
        doc.rect(margin, y, contentWidth, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        tableHeaders.forEach((header, index) => {
          const textX = margin + index * colWidth + 2;
          const textY = y + 5.5;
          doc.text(header, textX, textY);
        });
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
      }

      // Alternating row background
      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 250, 252); // Slate-50
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(margin, y, contentWidth, 7, "F");

      // Row border lines (horizontal only for clean look)
      doc.setDrawColor(241, 245, 249); // Slate-100
      doc.setLineWidth(0.2);
      doc.line(margin, y + 7, pageWidth - margin, y + 7);

      doc.setTextColor(51, 65, 85); // Slate-700
      row.forEach((cell, cellIndex) => {
        const textX = margin + cellIndex * colWidth + 2;
        const textY = y + 4.5;
        // Truncate cell text if too long
        const cellStr = cell === null || cell === undefined ? "" : String(cell);
        const truncated = doc.splitTextToSize(cellStr, colWidth - 4)[0] || "";
        doc.text(truncated, textX, textY);
      });

      y += 7;
    });
  }

  // Page 1 setup
  renderHeader(1);

  if (rows.length === 0) {
    // Handle empty data gracefully
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("No records available to display.", margin, y + 10);
  } else {
    drawTable(headers, rows);
  }

  // Apply footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    renderFooter(i, totalPages);
  }
  // Use data URI approach for reliable named downloads.
  // Blob URLs were ignoring the download attribute in this environment.
  const pdfBase64 = doc.output("datauristring");
  const link = document.createElement("a");
  link.href = pdfBase64;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 200);
}
