const service = require('../services/referralsService');
const {
  referralCreateSchema,
  referralUpdateSchema,
  referralsListQuerySchema,
} = require('../validation/referrals');
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
  const query = parseOrThrow(referralsListQuerySchema, req.query, 'query');
  res.json({ data: await service.listReferrals(req, query) });
}

async function get(req, res) {
  const { id } = parseOrThrow(idParamSchema, req.params, 'params');
  res.json({ data: await service.getReferral(req, id) });
}

async function create(req, res) {
  const input = parseOrThrow(referralCreateSchema, req.body, 'body');
  res.status(201).json({ data: await service.createReferral(req, input) });
}

async function update(req, res) {
  const { id } = parseOrThrow(idParamSchema, req.params, 'params');
  const patch = parseOrThrow(referralUpdateSchema, req.body, 'body');
  res.json({ data: await service.updateReferral(req, id, patch) });
}

async function sign(req, res) {
  const { id } = parseOrThrow(idParamSchema, req.params, 'params');
  res.json({ data: await service.signReferral(req, id) });
}

async function remove(req, res) {
  const { id } = parseOrThrow(idParamSchema, req.params, 'params');
  await service.deleteReferral(req, id);
  res.status(204).end();
}

module.exports = { list, get, create, update, sign, remove };
