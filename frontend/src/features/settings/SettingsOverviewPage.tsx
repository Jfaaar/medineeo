// Settings overview — the landing page for /app/settings.
//
// "What does my clinic look like right now?" — surfaces the active layout
// profile (record tabs / primary chart / dashboard preset / appointment
// types / templates) derived from the primary specialty, a count of enabled
// features by category, and quick links to every settings sub-page.
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Stethoscope, ToggleLeft, ShieldCheck, Building2, Users,
  LayoutGrid, Sparkles, Wrench, ArrowRight, CalendarClock, FileText, ClipboardList,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useClinicSpecialty } from './useClinicSpecialty';
import { useGetFeaturesQuery } from './api/featuresApi';
import type { SpecialtyCode } from './api/settingsApi';
import type { FeatureState } from '@/lib/features';

const SPECIALTY_LABEL_KEYS: Record<SpecialtyCode, string> = {
  general_practice: 'specialtyGeneralPractice',
  dental: 'specialtyDental',
  pediatrics: 'specialtyPediatrics',
  gynecology: 'specialtyGynecology',
  cardiology: 'specialtyCardiology',
  dermatology: 'specialtyDermatology',
  ent: 'specialtyEnt',
  ophthalmology: 'specialtyOphthalmology',
  orthopedics: 'specialtyOrthopedics',
  psychiatry: 'specialtyPsychiatry',
  other: 'specialtyOther',
};

const CHART_LABEL: Record<string, string> = {
  bodyRegionChart: 'Body-region chart',
  growthCharts: 'Growth charts',
  eyeExam: 'Eye exam (OD/OS)',
  none: 'None (trend graphs)',
};

const Chip: React.FC<{ children: React.ReactNode; tone?: 'default' | 'primary' | 'muted' }> = ({
  children,
  tone = 'default',
}) => {
  const tones = {
    default: 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200',
    primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200',
    muted: 'bg-surface-50 text-surface-500 dark:bg-surface-800/60 dark:text-surface-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md whitespace-nowrap ${tones[tone]}`}>{children}</span>
  );
};

interface QuickLinkProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}
const QuickLink: React.FC<QuickLinkProps> = ({ to, icon, title, description }) => (
  <Link
    to={to}
    className="group flex items-start gap-3 rounded-xl border border-surface-200 dark:border-surface-700 p-4 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors"
  >
    <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg text-primary-600 dark:text-primary-300 shrink-0">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5 font-medium text-surface-900 dark:text-white">
        {title}
        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{description}</p>
    </div>
  </Link>
);

export const SettingsOverviewPage: React.FC = () => {
  const { t } = useTranslation();
  const { primarySpecialty, enabledSpecialties, profile, isLoading } = useClinicSpecialty();
  const { data: features } = useGetFeaturesQuery();

  const featureCounts = useMemo(() => {
    const by: Record<FeatureState['category'], { on: number; total: number }> = {
      clinical: { on: 0, total: 0 },
      operations: { on: 0, total: 0 },
      admin: { on: 0, total: 0 },
    };
    for (const f of features ?? []) {
      by[f.category].total += 1;
      if (f.enabled) by[f.category].on += 1;
    }
    return by;
  }, [features]);

  const primaryLabel = t(SPECIALTY_LABEL_KEYS[primarySpecialty], primarySpecialty);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          {t('settingsOverviewTitle', 'Clinic settings')}
        </h1>
        <p className="text-surface-500">
          {t(
            'settingsOverviewSubtitle',
            'How this clinic is configured — specialty, the modules it surfaces, and the team that runs it.',
          )}
        </p>
      </header>

      {/* Active configuration */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg text-primary-600 dark:text-primary-300">
              <Stethoscope size={20} />
            </div>
            <h2 className="text-lg font-semibold">{t('settingsActiveConfig', 'Active configuration')}</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-surface-500">{t('specialtyPrimary', 'Primary specialty')}</dt>
              <dd><Chip tone="primary">{primaryLabel}</Chip></dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-surface-500 pt-0.5">{t('specialtyEnabled', 'Enabled specialties')}</dt>
              <dd className="flex flex-wrap gap-1.5 justify-end">
                {enabledSpecialties.map((s) => (
                  <Chip key={s} tone={s === primarySpecialty ? 'primary' : 'default'}>
                    {t(SPECIALTY_LABEL_KEYS[s as SpecialtyCode], s)}
                  </Chip>
                ))}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 pt-2 border-t border-surface-100 dark:border-surface-800">
              <dt className="text-surface-500 pt-0.5">{t('settingsFeaturesEnabled', 'Features enabled')}</dt>
              <dd className="flex flex-wrap gap-1.5 justify-end">
                <Chip><Sparkles size={11} className="inline mr-1" />{featureCounts.clinical.on}/{featureCounts.clinical.total} {t('featuresCategory_clinical', 'clinical')}</Chip>
                <Chip><Wrench size={11} className="inline mr-1" />{featureCounts.operations.on}/{featureCounts.operations.total} {t('featuresCategory_operations', 'operations')}</Chip>
                <Chip><ShieldCheck size={11} className="inline mr-1" />{featureCounts.admin.on}/{featureCounts.admin.total} {t('featuresCategory_admin', 'admin')}</Chip>
              </dd>
            </div>
          </dl>
        </Card>

        {/* Layout profile derived from the primary specialty */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-accent-100 dark:bg-accent-900/30 p-2 rounded-lg text-accent-600 dark:text-accent-300">
              <LayoutGrid size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('settingsLayoutProfile', 'Layout profile')}</h2>
              <p className="text-xs text-surface-500">
                {t('settingsLayoutProfileFor', 'for')} <span className="font-medium">{primaryLabel}</span>
              </p>
            </div>
          </div>
          {isLoading ? (
            <p className="text-sm text-surface-500">{t('loading', 'Loading…')}</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-surface-500 mb-1.5 flex items-center gap-1.5">
                  <ClipboardList size={14} />{t('settingsRecordTabs', 'Patient-record tabs')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.recordTabs.map((tab) => (
                    <Chip key={tab} tone={tab === profile.primaryChart ? 'primary' : 'default'}>{tab}</Chip>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-surface-500 flex items-center gap-1.5"><LayoutGrid size={14} />{t('settingsPrimaryChart', 'Primary chart')}</span>
                <Chip tone="primary">{CHART_LABEL[profile.primaryChart] ?? profile.primaryChart}</Chip>
              </div>
              <div>
                <div className="text-surface-500 mb-1.5 flex items-center gap-1.5">
                  <CalendarClock size={14} />{t('settingsApptTypes', 'Appointment types')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.appointmentTypes.map((a) => <Chip key={a} tone="muted">{a}</Chip>)}
                </div>
              </div>
              <div className="flex items-start justify-between gap-4 pt-2 border-t border-surface-100 dark:border-surface-800">
                <span className="text-surface-500 pt-0.5 flex items-center gap-1.5"><FileText size={14} />{t('settingsTemplates', 'Templates')}</span>
                <span className="flex flex-wrap gap-1.5 justify-end">
                  <Chip tone="muted">Rx: {profile.templates.prescription}</Chip>
                  <Chip tone="muted">Quote: {profile.templates.quote}</Chip>
                  <Chip tone="muted">Referral: {profile.templates.referral}</Chip>
                  <Chip tone="muted">Cert: {profile.templates.certificate}</Chip>
                </span>
              </div>
              <p className="text-xs text-surface-400 pt-1">
                {t(
                  'settingsLayoutProfileNote',
                  'Changing the primary specialty re-skins patient records, the dashboard and the calendar to match. Per-clinic feature overrides still win.',
                )}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500 mb-3">
          {t('settingsManage', 'Manage')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            to="../clinic" icon={<Building2 size={18} />}
            title={t('settingsTabClinic', 'Clinic profile')}
            description={t('settingsTabClinicDesc', 'Logo, tax ID, currency, timezone, working hours, invoice numbering.')}
          />
          <QuickLink
            to="../specialty" icon={<Stethoscope size={18} />}
            title={t('settingsTabSpecialty', 'Specialties')}
            description={t('settingsTabSpecialtyDesc', 'Primary specialty and the full set this clinic offers — drives the layout profile.')}
          />
          <QuickLink
            to="../features" icon={<ToggleLeft size={18} />}
            title={t('settingsTabFeatures', 'Features')}
            description={t('settingsTabFeaturesDesc', 'Per-clinic module toggles on top of the specialty defaults.')}
          />
          <QuickLink
            to="../roles" icon={<ShieldCheck size={18} />}
            title={t('settingsTabRoles', 'Roles')}
            description={t('settingsTabRolesDesc', 'Fine-grained permissions per role, with per-clinic overrides.')}
          />
          <QuickLink
            to="/app/team" icon={<Users size={18} />}
            title={t('settingsTabTeam', 'Team')}
            description={t('settingsTabTeamDesc', 'Staff members and invitations.')}
          />
        </div>
      </div>
    </div>
  );
};
