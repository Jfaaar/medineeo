const { z } = require('zod');

const REFERRAL_URGENCIES = ['routine', 'urgent'];

const referralCreateSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().optional().nullable(),
  recipientSpecialty: z.string().min(1),
  recipientName: z.string().optional().nullable(),
  urgency: z.enum(REFERRAL_URGENCIES).default('routine'),
  reason: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const referralUpdateSchema = referralCreateSchema.partial();

const referralsListQuerySchema = z.object({
  page: z.coerce.number().int().min(0).optional().default(0),
  pageSize: z.coerce.number().int().min(1).max(500).optional().default(50),
  patientId: z.string().optional(),
});

module.exports = {
  REFERRAL_URGENCIES,
  referralCreateSchema,
  referralUpdateSchema,
  referralsListQuerySchema,
};
