const service = require('../services/clinicalService');
const {
  clinicalNoteCreateSchema,
  clinicalNoteUpdateSchema,
  clinicalNotesListQuerySchema,
} = require('../validation/clinical');
const { idParamSchema } = require('../validation/common');
const { ApiError } = require('../middleware/errorHandler');

function parseOrThrow(schema, value, where = 'body') {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, 'VALIDATION', `Invalid ${where}`, result.error.flatten());
  }
  return result.data;
}

// Notes
async function listNotes(req, res) {
  const query = parseOrThrow(clinicalNotesListQuerySchema, req.query, 'query');
  res.json({ data: await service.listNotes(req, query) });
}
async function getNote(req, res) {
  const { id } = parseOrThrow(idParamSchema, req.params, 'params');
  res.json({ data: await service.getNote(req, id) });
}
async function createNote(req, res) {
  const input = parseOrThrow(clinicalNoteCreateSchema, req.body, 'body');
  res.status(201).json({ data: await service.createNote(req, input) });
}
async function updateNote(req, res) {
  const { id } = parseOrThrow(idParamSchema, req.params, 'params');
  const patch = parseOrThrow(clinicalNoteUpdateSchema, req.body, 'body');
  res.json({ data: await service.updateNote(req, id, patch) });
}
async function signNote(req, res) {
  const { id } = parseOrThrow(idParamSchema, req.params, 'params');
  res.json({ data: await service.signNote(req, id) });
}
async function deleteNote(req, res) {
  const { id } = parseOrThrow(idParamSchema, req.params, 'params');
  await service.deleteNote(req, id);
  res.status(204).end();
}

module.exports = {
  listNotes,
  getNote,
  createNote,
  updateNote,
  signNote,
  deleteNote,
};
