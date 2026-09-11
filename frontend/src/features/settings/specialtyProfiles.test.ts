// Regression test for the dental-pack removal: `dental` used to get its own
// DENTAL_PROFILE (dentalChart primary chart, tooth-procedure appointment
// types, dental prescription/quote templates). It's now just a clone of the
// general-practice profile like every other unimplemented specialty pack.
import { describe, it, expect } from 'vitest';
import { SPECIALTY_PROFILES, getSpecialtyProfile } from './specialtyProfiles';

describe('SPECIALTY_PROFILES.dental', () => {
  it('is a plain clone of general_practice, not a distinct dental profile', () => {
    const dental = getSpecialtyProfile('dental');
    const gp = getSpecialtyProfile('general_practice');

    expect(dental.code).toBe('dental');
    expect(dental.primaryChart).toBe(gp.primaryChart);
    expect(dental.recordTabs).toEqual(gp.recordTabs);
    expect(dental.appointmentTypes).toEqual(gp.appointmentTypes);
    expect(dental.templates).toEqual(gp.templates);
  });

  it('no profile uses a dentalChart primary chart (the type no longer allows it)', () => {
    for (const profile of Object.values(SPECIALTY_PROFILES)) {
      expect(profile.primaryChart).not.toBe('dentalChart');
    }
  });

  it('no profile references dental-specific templates', () => {
    for (const profile of Object.values(SPECIALTY_PROFILES)) {
      expect(profile.templates.prescription).not.toBe('dental');
      expect(profile.templates.quote).not.toBe('dentalEstimate');
      expect(profile.templates.referral).not.toBe('dental');
    }
  });
});
