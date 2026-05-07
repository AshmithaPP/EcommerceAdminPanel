import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Handles CSV and PDF exports for analytics data.
 */
const ExportManager = {
  /**
   * Simple CSV export from JSON data
   */
  exportToCSV: (data, fileName) => {
    if (!data || !data.length) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const val = row[header] === null ? '' : row[header];
        return `"${val}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  /**
   * Export to PDF with a professional table layout
   */
  exportToPDF: (data, title, fileName) => {
    try {
      if (!data || !data.length) return;

      const doc = new jsPDF();
      
      // Add Title
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      
      // Add Subtitle (Date)
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

      const headers = Object.keys(data[0]);
      // Ensure all values are strings or numbers
      const body = data.map(row => 
        headers.map(header => {
          const val = row[header];
          if (val === null || val === undefined) return '';
          return val.toString();
        })
      );

      autoTable(doc, {
        head: [headers.map(h => h.toUpperCase().replace('_', ' '))],
        body: body,
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // Brand color
        styles: { fontSize: 9 }
      });

      doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
      return true;
    } catch (error) {
      console.error('PDF Export Error:', error);
      throw error;
    }
  }
};

export default ExportManager;
