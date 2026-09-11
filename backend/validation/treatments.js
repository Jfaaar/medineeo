const { z } = require('zod');

const TREATMENT_STATUSES = ['planned', 'in_progress', 'completed', 'canceled'];

const consumedMaterialSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number(),
});

const treatmentCreateSchema = z.object({
  patientId: z.string().min(1),
  description: z.string().min(1),
  price: z.number(),
  status: z.enum(TREATMENT_STATUSES),
  date: z.string().optional(),
  materialsUsed: z.array(consumedMaterialSchema).optional(),
});

const treatmentUpdateSchema = treatmentCreateSchema.partial();

const treatmentsListQuerySchema = z.object({
  page: z.coerce.number().int().min(0).optional().default(0),
  pageSize: z.coerce.number().int().min(1).max(500).optional().default(200),
  patientId: z.string().optional(),
});

module.exports = {
  treatmentCreateSchema,
  treatmentUpdateSchema,
  treatmentsListQuerySchema,
};
