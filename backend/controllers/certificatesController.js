const service = require('../services/certificatesService');
const {
  certificateCreateSchema,
  certificateUpdateSchema,
  certificatesListQuerySchema,
} = require('../validation/certificates');
const { idParamSchema } = require('../validation/common');
const { ApiError } = require('../middleware/errorHandler');

function parseOrThrow(schema, value, where = 'body') {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, 'VALIDATION', `Invalid ${where}`, result.error.flatten());
  }
  return result.data;
}

async function list(req, res) {
  const query = parseOrThrow(certificatesListQuerySchema, req.query, 'query');
  res.json({ data: await service.listCertificates(req, query) });
}

async function get(req, res) {
  const { id } = parseOrThrow(idParamSchema, req.params, 'params');
  res.json({ data: await service.getCertificate(req, id) });
}

async function create(req, res) {
  const input = parseOrThrow(certificateCreateSchema, req.body, 'body');
  res.status(201).json({ data: await service.createCertificate(req, input) });
}

async function update(req, res) {
  const { id } = parseOrThrow(idParamSchema, req.params, 'params');
  const patch = parseOrThrow(certificateUpdateSchema, req.body, 'body');
  res.json({ data: await service.updateCertificate(req, id, patch) });
}

async function sign(req, res) {
  const { id } = parseOrThrow(idParamSchema, req.params, 'params');
  res.json({ data: await service.signCertificate(req, id) });
}

async function remove(req, res) {
  const { id } = parseOrThrow(idParamSchema, req.params, 'params');
  await service.deleteCertificate(req, id);
  res.status(204).end();
}

module.exports = { list, get, create, update, sign, remove };
