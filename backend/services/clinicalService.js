// Clinical notes.
const notesRepo = require('../repositories/clinicalNotesRepository');
const { ApiError } = require('../middleware/errorHandler');

function requireClinic(req) {
  if (!req.user?.clinicId) {
    throw new ApiError(400, 'MISSING_CLINIC', 'User has no associated clinic');
  }
  return req.user.clinicId;
}

// Notes
function listNotes(req, query) {
  return notesRepo.list(req.db, query);
}

async function getNote(req, id) {
  const n = await notesRepo.get(req.db, id);
  if (!n) throw new ApiError(404, 'NOT_FOUND', 'Clinical note not found');
  return n;
}

function createNote(req, input) {
  return notesRepo.create(req.db, input, requireClinic(req));
}

async function updateNote(req, id, patch) {
  const existing = await notesRepo.get(req.db, id);
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Clinical note not found');
  if (existing.signedAt) {
    throw new ApiError(400, 'NOTE_LOCKED', 'Cannot modify a signed clinical note');
  }
  return notesRepo.update(req.db, id, patch);
}

async function signNote(req, id) {
  const existing = await notesRepo.get(req.db, id);
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Clinical note not found');
  if (existing.signedAt) return existing;
  return notesRepo.update(req.db, id, { signedAt: new Date().toISOString() });
}

async function deleteNote(req, id) {
  await notesRepo.remove(req.db, id);
}

module.exports = {
  listNotes,
  getNote,
  createNote,
  updateNote,
  signNote,
  deleteNote,
};
