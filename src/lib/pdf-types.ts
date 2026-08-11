/**
 * Helper type untuk jsPDF + jspdf-autotable — `lastAutoTable` tidak di-expose
 * oleh typings resmi. Pakai: `(doc as unknown as AutoTableDoc).lastAutoTable.finalY`
 */
export interface AutoTableDoc {
  lastAutoTable: { finalY: number }
}
