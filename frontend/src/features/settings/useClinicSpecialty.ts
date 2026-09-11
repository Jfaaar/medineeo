// Reads the current clinic's specialty configuration from RTK Query and
// resolves the per-specialty layout profile (SPECIALTY_PROFILES).
//
// Specialty is orthogonal to role-permissions — do not couple them.
// `enabled_specialties` controls which feature keys are auto-enabled;
// `primary_specialty` controls the layout profile (record tabs, primary
// chart, dashboard preset, appointment types, templates).
//
// New code should read `profile` rather than the `isDental` / `isGeneralPractice`
// booleans; those are kept for back-compat with existing call sites.
import { useGetSettingsQuery } from './api/settingsApi';
import type { SpecialtyCode } from './api/settingsApi';
import { getSpecialtyProfile, type SpecialtyProfile } from './specialtyProfiles';

const FALLBACK_PRIMARY: SpecialtyCode = 'general_practice';
const FALLBACK_ENABLED: SpecialtyCode[] = ['general_practice'];

export interface ClinicSpecialtyState {
  primarySpecialty: SpecialtyCode;
  enabledSpecialties: SpecialtyCode[];
  isLoading: boolean;
  has: (specialty: SpecialtyCode) => boolean;
  /** Per-`primary_specialty` layout profile — record tabs, chart, dashboard preset, templates. */
  profile: SpecialtyProfile;
  /** @deprecated read `has('dental')` instead. */
  isDental: boolean;
  /** @deprecated read `has('general_practice')` instead. */
  isGeneralPractice: boolean;
}

export function useClinicSpecialty(): ClinicSpecialtyState {
  const { data, isLoading } = useGetSettingsQuery();
  const primarySpecialty = data?.primarySpecialty ?? FALLBACK_PRIMARY;
  const enabledSpecialties = data?.enabledSpecialties?.length
    ? data.enabledSpecialties
    : FALLBACK_ENABLED;

  const has = (specialty: SpecialtyCode) => enabledSpecialties.includes(specialty);

  return {
    primarySpecialty,
    enabledSpecialties,
    isLoading,
    has,
    profile: getSpecialtyProfile(primarySpecialty),
    isDental: has('dental'),
    isGeneralPractice: has('general_practice'),
  };
}
