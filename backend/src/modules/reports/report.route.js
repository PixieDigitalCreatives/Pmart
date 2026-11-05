'use strict';

const { Router } = require('express');
const { buildReport, REPORT_LIST } = require('./report.service');
const { reportCsv, reportPdf } = require('./report-export');
const { protect, authorize, authorizePermission: can } = require('../../middleware/auth.middleware');
const { UserRole } = require('../auth/auth.model');
const { parsePagination } = require('../../utils/validation');

const router = Router();

router.use(protect, authorize(UserRole.ADMIN, UserRole.EMPLOYEE), can('reports.read'));

router.get('/', (req, res) => res.json({ success: true, data: REPORT_LIST }));

/** GET /api/reports/:type?from=YYYY-MM-DD&to=YYYY-MM-DD&format=json|csv|pdf */
router.get('/:type', async (req, res) => {
  const query = { from: req.query.from ? String(req.query.from) : undefined, to: req.query.to ? String(req.query.to) : undefined };
  const report = await buildReport(String(req.params.type), query);
  const fileName = `pmart-${report.type}-${new Date().toISOString().slice(0, 10)}`;

  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);
    return res.send(reportCsv(report));
  }
  if (req.query.format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
    return reportPdf(report, res);
  }
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 100, maxLimit: 500 });
  res.json({
    success: true,
    data: { ...report, rows: report.rows.slice(skip, skip + limit) },
    pagination: { total: report.rows.length, page, limit, pages: Math.ceil(report.rows.length / limit) }
  });
});

module.exports = router;
