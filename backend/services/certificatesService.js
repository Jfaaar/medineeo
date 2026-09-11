const repo = require('../repositories/certificatesRepository');
const { ApiError } = require('../middleware/errorHandler');

function listCertificates(req, query) {
  return repo.list(req.db, query);
}

async function getCertificate(req, id) {
  const c = await repo.get(req.db, id);
  if (!c) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  return c;
}

function createCertificate(req, input) {
  if (!req.user?.clinicId) {
    throw new ApiError(400, 'MISSING_CLINIC', 'User has no associated clinic');
  }
  return repo.create(req.db, input, req.user.clinicId);
}

async function updateCertificate(req, id, patch) {
  const existing = await repo.get(req.db, id);
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  if (existing.signedAt) {
    throw new ApiError(400, 'CERTIFICATE_LOCKED', 'Cannot modify a signed certificate');
  }
  return repo.update(req.db, id, patch);
}

async function signCertificate(req, id) {
  const existing = await repo.get(req.db, id);
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  if (existing.signedAt) return existing;
  return repo.sign(req.db, id);
}

async function deleteCertificate(req, id) {
  await repo.remove(req.db, id);
}

module.exports = {
  listCertificates,
  getCertificate,
  createCertificate,
  updateCertificate,
  signCertificate,
  deleteCertificate,
};
