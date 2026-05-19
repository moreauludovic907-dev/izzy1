import jsPDF from 'jspdf';
import type { Quote, UserProfile } from '@/types';
import { fmtEUR } from './quote';

export function downloadQuotePDF(quote: Quote, profile: UserProfile | null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 30);
  doc.text(profile?.companyName || 'Mon entreprise', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 120);
  y += 6;
  if (profile?.trade) { doc.text(profile.trade, margin, y); y += 4; }
  if (profile?.phone) { doc.text(profile.phone, margin, y); y += 4; }
  if (profile?.email) { doc.text(profile.email, margin, y); y += 4; }
  if (profile?.siret) { doc.text('SIRET: ' + profile.siret, margin, y); y += 4; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(139, 92, 246);
  doc.text('DEVIS', pageW - margin, 24, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 50);
  doc.text('N° ' + quote.number, pageW - margin, 32, { align: 'right' });
  doc.text(new Date(quote.createdAt).toLocaleDateString('fr-FR'), pageW - margin, 37, { align: 'right' });

  y = Math.max(y, 60);
  doc.setDrawColor(220, 220, 230);
  doc.setFillColor(248, 248, 252);
  doc.roundedRect(margin, y, pageW - margin * 2, 22, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 150);
  doc.text('CLIENT', margin + 4, y + 6);
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 30);
  doc.text(quote.clientName || '—', margin + 4, y + 14);
  y += 30;

  doc.setFillColor(139, 92, 246);
  doc.rect(margin, y, pageW - margin * 2, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('DÉSIGNATION', margin + 2, y + 5.5);
  doc.text('QTÉ', pageW - 80, y + 5.5);
  doc.text('PU HT', pageW - 60, y + 5.5);
  doc.text('TVA', pageW - 40, y + 5.5);
  doc.text('TOTAL HT', pageW - margin, y + 5.5, { align: 'right' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 50);
  for (const l of quote.lines) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.text(l.label, margin + 2, y, { maxWidth: pageW - 100 });
    doc.text(`${l.quantity} ${l.unit || ''}`, pageW - 80, y);
    doc.text(fmtEUR(l.unitPrice), pageW - 60, y);
    doc.text(`${l.vatRate}%`, pageW - 40, y);
    doc.text(fmtEUR(l.quantity * l.unitPrice), pageW - margin, y, { align: 'right' });
    y += 7;
  }

  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 120);
  doc.text('Total HT', pageW - margin - 50, y);
  doc.setTextColor(40, 40, 50);
  doc.text(fmtEUR(quote.totalHT), pageW - margin, y, { align: 'right' });
  y += 6;
  doc.setTextColor(110, 110, 120);
  doc.text('TVA', pageW - margin - 50, y);
  doc.setTextColor(40, 40, 50);
  doc.text(fmtEUR(quote.totalVAT), pageW - margin, y, { align: 'right' });
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(139, 92, 246);
  doc.text('Total TTC', pageW - margin - 50, y);
  doc.text(fmtEUR(quote.totalTTC), pageW - margin, y, { align: 'right' });

  doc.save(`devis-${quote.number}.pdf`);
}
