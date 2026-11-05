'use strict';

const PDFDocument = require('pdfkit');
const { toCsv } = require('../../utils/csv');

const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const fmtMoney = (n) => (n === undefined || n === null || n === '' ? '' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtQty = (n) => (n === undefined || n === null || n === '' ? '' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 3 }));

function cellText(row, c, forCsv) {
  const v = row[c.key];
  if (v === undefined || v === null) return '';
  if (c.kind === 'date') return forCsv ? new Date(v).toISOString() : fmtDate(v);
  if (forCsv) return typeof v === 'number' ? String(v) : String(v);
  if (c.kind === 'money') return fmtMoney(v);
  if (c.kind === 'qty') return fmtQty(v);
  return String(v);
}

function reportCsv(report) {
  const rows = [report.columns.map((c) => c.label), ...report.rows.map((r) => report.columns.map((c) => cellText(r, c, true)))];
  if (report.totals) rows.push(report.columns.map((c, i) => (i === 0 ? 'Total' : report.totals[c.key] !== undefined ? String(report.totals[c.key]) : '')));
  return `﻿${toCsv(rows)}`;
}

/** Landscape A4 table with repeated header rows, written to `out`. */
function reportPdf(report, out) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28, info: { Title: report.title } });
  doc.pipe(out);
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const bottom = () => doc.page.height - doc.page.margins.bottom - 14;
  const totalWeight = report.columns.reduce((s, c) => s + (c.weight || 1), 0);
  const widths = report.columns.map((c) => (width * (c.weight || 1)) / totalWeight);
  const xs = widths.map((_, i) => left + widths.slice(0, i).reduce((s, w) => s + w, 0));
  const align = (c) => (c.kind === 'money' || c.kind === 'qty' ? 'right' : 'left');

  doc.font('Helvetica-Bold').fontSize(13).text(report.title, left, doc.page.margins.top);
  doc.font('Helvetica').fontSize(8).fillColor('#444444');
  const period = report.dated ? `Period: ${report.from || 'start'} to ${report.to || 'today'}` : 'As of now';
  doc.text(`${period}   ·   Generated ${fmtDate(report.generatedAt)}   ·   ${report.rows.length} rows`);
  (report.summary || []).forEach((s) => doc.text(s));
  doc.fillColor('black');
  let y = doc.y + 8;

  const header = () => {
    doc.rect(left, y, width, 14).fill('#e2e8f0').fillColor('black');
    doc.font('Helvetica-Bold').fontSize(7);
    report.columns.forEach((c, i) => doc.text(c.label, xs[i] + 2, y + 4, { width: widths[i] - 4, align: align(c), lineBreak: false, ellipsis: true }));
    y += 16;
    doc.font('Helvetica').fontSize(7);
  };
  header();

  const drawRow = (cells, bold) => {
    if (y + 11 > bottom()) {
      doc.addPage();
      y = doc.page.margins.top;
      header();
    }
    if (bold) doc.font('Helvetica-Bold');
    report.columns.forEach((c, i) => doc.text(cells[i], xs[i] + 2, y, { width: widths[i] - 4, align: align(c), lineBreak: false, ellipsis: true }));
    if (bold) doc.font('Helvetica');
    y += 11;
  };

  report.rows.forEach((r) => drawRow(report.columns.map((c) => cellText(r, c, false))));
  if (report.totals) {
    doc.moveTo(left, y).lineTo(left + width, y).strokeColor('#999999').stroke();
    y += 2;
    drawRow(
      report.columns.map((c, i) => (i === 0 ? 'Total' : report.totals[c.key] !== undefined ? (c.kind === 'money' ? fmtMoney(report.totals[c.key]) : fmtQty(report.totals[c.key])) : '')),
      true
    );
  }
  if (report.rows.length === 0) doc.text('No records for this report.', left, y + 6);
  doc.end();
}

module.exports = { reportCsv, reportPdf };
