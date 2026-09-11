// MediNEEO API - bootstrap entry point.
// Phase 4 hardening: helmet, rate limit, CORS allowlist, modular routers.
//
// Public surface is preserved (paths/methods/response shapes match the
// pre-split monolith). Error responses for invalid input are now structured
// as { error, issues } via the Zod validation middleware.
const path = require('path');
// Phase 0 compatibility: env file was moved with the frontend during the workspace split.
// Phase 3 will introduce a backend-specific .env.local with only the server-side vars.
require('dotenv').config({ path: path.join(__dirname, '..', 'frontend', '.env.local') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { authLimiter, defaultLimiter } = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');

const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const backofficeRouter = require('./routes/backoffice');
const staffRouter = require('./routes/staff');
const documentsRouter = require('./routes/documents');
const { router: uploadsRouter } = require('./routes/uploads');
const patientsRouter = require('./routes/patients');
const appointmentsRouter = require('./routes/appointments');
const invoicesRouter = require('./routes/invoices');
const paymentsRouter = require('./routes/payments');
const treatmentsRouter = require('./routes/treatments');
const treatmentPlansRouter = require('./routes/treatmentPlans');
const quotesRouter = require('./routes/quotes');
const prescriptionsRouter = require('./routes/prescriptions');
const certificatesRouter = require('./routes/certificates');
const referralsRouter = require('./routes/referrals');
const inventoryRouter = require('./routes/inventory');
const suppliersRouter = require('./routes/suppliers');
const inventoryTransactionsRouter = require('./routes/inventoryTransactions');
const clinicalRouter = require('./routes/clinical');
const medicalRouter = require('./routes/medical');
const insuranceRouter = require('./routes/insurance');
const settingsRouter = require('./routes/settings');
const statsRouter = require('./routes/stats');
const medicamentsCatalogRouter = require('./routes/medicamentsCatalog');
const featuresRouter = require('./routes/features');

const { getPool } = require('./db/pg');
const { bootstrap: bootstrapDb } = require('./db/migrate');

function buildCorsOptions() {
  const raw = process.env.CORS_ORIGINS || '';
  const allowlist = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (allowlist.length === 0) {
    // Default to permissive in dev to avoid surprises; production should set CORS_ORIGINS.
    return { origin: true, credentials: true };
  }

  return {
    origin(origin, cb) {
      // Allow same-origin / curl (no Origin header)
      if (!origin) return cb(null, true);
      if (allowlist.includes(origin)) return cb(null, true);
      return cb(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  };
}

function createApp() {
  const app = express();

  // Express runs behind Vercel/proxies in production; trust the first hop so
  // rate-limit and audit logs see the real client IP.
  app.set('trust proxy', 1);

  // Security headers + CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          frameAncestors: ["'self'"],
        },
      },
      hsts: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
        preload: true,
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '5mb' }));

  // Default rate limit for the API surface; auth endpoints get a tighter cap.
  app.use('/api/auth', authLimiter);
  app.use('/api', defaultLimiter);

  // Static uploads (radiology)
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // ----------------- Routers -----------------
  app.use('/api/health', healthRouter);

  // Public auth routes are mounted twice for backwards compatibility:
  //   /api/invitations/:token (legacy)
  //   /api/auth/invitations/:token (new, rate-limited)
  app.use('/api/auth/invitations', authRouter);
  app.use('/api/invitations', authRouter);

  // Backoffice + Admin (super_admin)
  app.use('/api', backofficeRouter);

  // Staff + Clinic
  app.use('/api', staffRouter);

  // Patients / Appointments / Invoices
  app.use('/api', documentsRouter);

  // Radiology uploads (multer)
  app.use('/api', uploadsRouter);

  // ----- v1 layered routes (controllers/services/repositories) -----
  app.use('/api/v1/patients', patientsRouter);
  app.use('/api/v1/appointments', appointmentsRouter);
  app.use('/api/v1/invoices', invoicesRouter);
  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/treatments', treatmentsRouter);
  app.use('/api/v1/treatment-plans', treatmentPlansRouter);
  app.use('/api/v1/quotes', quotesRouter);
  app.use('/api/v1/prescriptions', prescriptionsRouter);
  app.use('/api/v1/certificates', certificatesRouter);
  app.use('/api/v1/referrals', referralsRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/suppliers', suppliersRouter);
  app.use('/api/v1/inventory-transactions', inventoryTransactionsRouter);
  app.use('/api/v1/clinical', clinicalRouter);
  app.use('/api/v1/medical', medicalRouter);
  app.use('/api/v1/insurance', insuranceRouter);
  app.use('/api/v1/settings', settingsRouter);
  app.use('/api/v1/stats', statsRouter);
  app.use('/api/v1/medicaments-catalog', medicamentsCatalogRouter);
  app.use('/api/v1/features', featuresRouter);

  // Global structured error handler (unified envelope)
  app.use(errorHandler);

  // Production static serving (kept for parity with the previous monolith)
  if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '..', 'build');
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(buildPath, 'index.html'));
      }
    });
  }

  return app;
}

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  bootstrapDb(getPool())
    .catch(err => {
      // eslint-disable-next-line no-console
      console.error('[startup] db bootstrap failed:', err);
      process.exit(1);
    })
    .then(() => {
      const app = createApp();
      app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`Server running on port ${PORT}`);
      });
    });
}

module.exports = { createApp };
