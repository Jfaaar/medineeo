const repo = require('../repositories/referralsRepository');
const { ApiError } = require('../middleware/errorHandler');

function listReferrals(req, query) {
  return repo.list(req.db, query);
}

async function getReferral(req, id) {
  const r = await repo.get(req.db, id);
  if (!r) throw new ApiError(404, 'NOT_FOUND', 'Referral not found');
  return r;
}

function createReferral(req, input) {
  if (!req.user?.clinicId) {
    throw new ApiError(400, 'MISSING_CLINIC', 'User has no associated clinic');
  }
  return repo.create(req.db, input, req.user.clinicId);
}

async function updateReferral(req, id, patch) {
  const existing = await repo.get(req.db, id);
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Referral not found');
  if (existing.signedAt) {
    throw new ApiError(400, 'REFERRAL_LOCKED', 'Cannot modify a signed referral letter');
  }
  return repo.update(req.db, id, patch);
}

async function signReferral(req, id) {
  const existing = await repo.get(req.db, id);
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Referral not found');
  if (existing.signedAt) return existing;
  return repo.sign(req.db, id);
}

async function deleteReferral(req, id) {
  await repo.remove(req.db, id);
}

module.exports = {
  listReferrals,
  getReferral,
  createReferral,
  updateReferral,
  signReferral,
  deleteReferral,
};
