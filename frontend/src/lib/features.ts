// Canonical feature catalog — mirrors backend/lib/features.js and the seed in
// backend/db/migrations/0011_feature_access.sql + 0012_core_feature_keys.sql.
//
// The DB row for each feature is authoritative for default_specialties /
// default_permission / display_name. This file is just the type-safe union
// so call sites get autocomplete on FeatureKey.
import type { Permission } from './permissions';
import type { SpecialtyCode } from '@/features/settings/api/settingsApi';

export const FEATURE_KEYS = [
  'dashboard',
  'calendar',
  'waitingRoom',
  'patients',
  'clinicalNotes',
  'allergies',
  'medicationList',
  'vitals',
  'problemList',
  'bodyRegionChart',
  'vaccinations',
  'treatments',
  'prescriptions',
  'quotes',
  'insurance',
  'invoices',
  'inventory',
  'medicaments',
  'documents',
  'reports',
  'certificates',
  'referrals',
  'team',
  'settings',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_KEY_SET: ReadonlySet<FeatureKey> = new Set(FEATURE_KEYS);

export const isFeatureKey = (v: unknown): v is FeatureKey =>
  typeof v === 'string' && FEATURE_KEY_SET.has(v as FeatureKey);

export interface FeatureDefinition {
  featureKey: FeatureKey;
  displayName: string;
  description: string | null;
  defaultSpecialties: SpecialtyCode[];
  defaultPermission: Permission;
  category: 'clinical' | 'operations' | 'admin';
  sortOrder: number;
}

export interface FeatureState extends FeatureDefinition {
  autoEnabled: boolean;
  enabled: boolean;
  source: 'auto' | 'override';
  overrideUpdatedAt: string | null;
}
