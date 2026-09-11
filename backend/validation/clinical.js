const { z } = require('zod');

// Clinical notes
const clinicalNoteCreateSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  appointmentId: z.string().optional().nullable(),
  consultationReason: z.string().optional().nullable(),
  symptoms: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  treatmentPlan: z.string().optional().nullable(),
  followUp: z.string().optional().nullable(),
  vitals: z.record(z.union([z.number(), z.string()])).optional().nullable(),
  subjective: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  assessment: z.string().optional().nullable(),
  plan: z.string().optional().nullable(),
});

const clinicalNoteUpdateSchema = clinicalNoteCreateSchema.partial();

const clinicalNotesListQuerySchema = z.object({
  page: z.coerce.number().int().min(0).optional().default(0),
  pageSize: z.coerce.number().int().min(1).max(500).optional().default(50),
  patientId: z.string().optional(),
});

module.exports = {
  clinicalNoteCreateSchema,
  clinicalNoteUpdateSchema,
  clinicalNotesListQuerySchema,
};
