const { z } = require('zod');

// Must mirror the plan_status enum from migration 0001.
const PLAN_STATUSES = ['draft', 'proposed', 'accepted', 'rejected', 'completed', 'canceled'];

const treatmentPlanCreateSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(PLAN_STATUSES).default('draft'),
  estimatedTotal: z.number().optional(),
  discount: z.number().optional(),
  insuranceCovered: z.number().optional(),
  patientResponsibility: z.number().optional(),
  acceptedAt: z.string().optional().nullable(),
});

const treatmentPlanUpdateSchema = treatmentPlanCreateSchema.partial();

const treatmentPlansListQuerySchema = z.object({
  page: z.coerce.number().int().min(0).optional().default(0),
  pageSize: z.coerce.number().int().min(1).max(500).optional().default(50),
  patientId: z.string().optional(),
  status: z.enum(PLAN_STATUSES).optional(),
  search: z.string().optional(),
});

// Items live in the `treatments` table, scoped to plan_id.
const planItemCreateSchema = z.object({
  description: z.string().min(1),
  price: z.number().nonnegative().default(0),
});

const convertToAppointmentsSchema = z.object({
  startDate: z.string().min(1), // ISO date or datetime
  durationMinutes: z.number().int().min(5).max(480).default(30),
  spacingDays: z.number().int().min(0).max(365).default(1),
});

module.exports = {
  treatmentPlanCreateSchema,
  treatmentPlanUpdateSchema,
  treatmentPlansListQuerySchema,
  planItemCreateSchema,
  convertToAppointmentsSchema,
};
