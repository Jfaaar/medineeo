// SPECIALTY_PROFILES — per-`primary_specialty` "skin" of the app.
//
// `enabled_specialties` is a *set* and decides which feature keys are
// auto-enabled (via feature_definitions.default_specialties ∩ enabled_specialties).
// `primary_specialty` is a *single* value and decides this profile: the patient
// record's tab order, which visual chart shows, the dashboard preset, the
// appointment-type seed list, and which template IDs to use for prescriptions
// / quotes / referrals / certificates.
//
// Phase 0 seeds the structure with one real profile (general_practice) and
// clones it for every other specialty. Each pack phase fills in its own
// specialty's profile (record tabs, primaryChart, dashboardPreset,
// appointmentTypes, templates) per the SPECIALTY_FEATURES.md §4 spec.

import type { FeatureKey } from '@/lib/features';
import type { SpecialtyCode } from './api/settingsApi';

export type RecordTab = FeatureKey | 'overview' | 'billing' | 'documents';

export type PrimaryChart =
  | 'bodyRegionChart'
  | 'growthCharts'
  | 'eyeExam'
  | 'none';

export interface SpecialtyTemplates {
  prescription: string;
  quote: string;
  referral: string;
  certificate: string;
}

export interface SpecialtyProfile {
  code: SpecialtyCode;
  recordTabs: RecordTab[];
  primaryChart: PrimaryChart;
  dashboardPreset: string;
  appointmentTypes: string[];
  templates: SpecialtyTemplates;
}

const GENERIC_TEMPLATES: SpecialtyTemplates = {
  prescription: 'generic',
  quote: 'generic',
  referral: 'generic',
  certificate: 'generic',
};

const GP_PROFILE: SpecialtyProfile = {
  code: 'general_practice',
  recordTabs: [
    'overview',
    'vitals',
    'problemList',
    'medicationList',
    'allergies',
    'clinicalNotes',
    'vaccinations',
    'documents',
    'billing',
  ],
  primaryChart: 'bodyRegionChart',
  dashboardPreset: 'gp',
  appointmentTypes: [
    'consultation',
    'followUp',
    'annualPhysical',
    'vaccination',
    'procedure',
    'teleconsultation',
  ],
  templates: GENERIC_TEMPLATES,
};

function cloneFromGp(code: SpecialtyCode): SpecialtyProfile {
  return { ...GP_PROFILE, code };
}

export const SPECIALTY_PROFILES: Record<SpecialtyCode, SpecialtyProfile> = {
  general_practice: GP_PROFILE,
  dental: cloneFromGp('dental'),
  pediatrics: cloneFromGp('pediatrics'),
  gynecology: cloneFromGp('gynecology'),
  cardiology: cloneFromGp('cardiology'),
  dermatology: cloneFromGp('dermatology'),
  ent: cloneFromGp('ent'),
  ophthalmology: cloneFromGp('ophthalmology'),
  orthopedics: cloneFromGp('orthopedics'),
  psychiatry: cloneFromGp('psychiatry'),
  other: cloneFromGp('other'),
};

export function getSpecialtyProfile(code: SpecialtyCode): SpecialtyProfile {
  return SPECIALTY_PROFILES[code] ?? GP_PROFILE;
}
