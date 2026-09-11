const { z } = require('zod');

const CERTIFICATE_TYPES = ['sick_leave', 'fitness', 'school_work', 'travel', 'other'];

const certificateCreateSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().optional().nullable(),
  type: z.enum(CERTIFICATE_TYPES).default('sick_leave'),
  reason: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  restDays: z.number().int().min(0).optional().nullable(),
  content: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const certificateUpdateSchema = certificateCreateSchema.partial();

const certificatesListQuerySchema = z.object({
  page: z.coerce.number().int().min(0).optional().default(0),
  pageSize: z.coerce.number().int().min(1).max(500).optional().default(50),
  patientId: z.string().optional(),
});

module.exports = {
  CERTIFICATE_TYPES,
  certificateCreateSchema,
  certificateUpdateSchema,
  certificatesListQuerySchema,
};
