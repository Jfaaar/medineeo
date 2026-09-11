// Body-region chart: a simple SVG body silhouette divided into clickable
// regions. Clicking a region opens a modal to record a finding tied to
// that region.
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  useListBodyRegionsQuery,
  useCreateBodyRegionMutation,
  useDeleteBodyRegionMutation,
  type BodyRegionSide,
} from '../../clinical/api/medicalApi';

interface Props {
  patientId: string;
}

interface RegionDef {
  id: string;
  labelKey: string;
  defaultLabel: string;
  // x,y in 100x200 viewBox; w,h are the click target size.
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
}

const REGIONS: RegionDef[] = [
  { id: 'head', labelKey: 'regionHead', defaultLabel: 'Head', x: 40, y: 4, w: 20, h: 22, rx: 10 },
  { id: 'neck', labelKey: 'regionNeck', defaultLabel: 'Neck', x: 44, y: 26, w: 12, h: 6 },
  { id: 'chest', labelKey: 'regionChest', defaultLabel: 'Chest', x: 30, y: 32, w: 40, h: 26, rx: 6 },
  { id: 'abdomen', labelKey: 'regionAbdomen', defaultLabel: 'Abdomen', x: 32, y: 58, w: 36, h: 20, rx: 4 },
  { id: 'pelvis', labelKey: 'regionPelvis', defaultLabel: 'Pelvis', x: 32, y: 78, w: 36, h: 14, rx: 4 },
  { id: 'upper_limb_left', labelKey: 'regionUpperLimbLeft', defaultLabel: 'Left arm', x: 14, y: 34, w: 14, h: 50, rx: 6 },
  { id: 'upper_limb_right', labelKey: 'regionUpperLimbRight', defaultLabel: 'Right arm', x: 72, y: 34, w: 14, h: 50, rx: 6 },
  { id: 'lower_limb_left', labelKey: 'regionLowerLimbLeft', defaultLabel: 'Left leg', x: 32, y: 92, w: 16, h: 96, rx: 6 },
  { id: 'lower_limb_right', labelKey: 'regionLowerLimbRight', defaultLabel: 'Right leg', x: 52, y: 92, w: 16, h: 96, rx: 6 },
];

export const BodyRegionChart: React.FC<Props> = ({ patientId }) => {
  const { t } = useTranslation();
  const { data } = useListBodyRegionsQuery({ patientId, pageSize: 200 });
  const [createFinding, { isLoading: isCreating }] = useCreateBodyRegionMutation();
  const [deleteFinding] = useDeleteBodyRegionMutation();

  const [selected, setSelected] = useState<RegionDef | null>(null);
  const [finding, setFinding] = useState('');
  const [side, setSide] = useState<BodyRegionSide | ''>('');
  const [severity, setSeverity] = useState('');
  const [notes, setNotes] = useState('');

  const findings = data?.data ?? [];
  const findingsByRegion = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.region] = (acc[f.region] ?? 0) + 1;
    return acc;
  }, {});

  const close = () => {
    setSelected(null);
    setFinding('');
    setSide('');
    setSeverity('');
    setNotes('');
  };

  const handleSave = async () => {
    if (!selected || !finding.trim()) return;
    await createFinding({
      patientId,
      region: selected.id,
      side: side || undefined,
      finding: finding.trim(),
      severity: severity || undefined,
      notes: notes || undefined,
    }).unwrap();
    close();
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-lg font-semibold mb-4">{t('bodyRegionChartTitle', 'Body chart')}</h3>
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 100 200" className="max-w-[280px] w-full text-surface-300 dark:text-surface-700">
            {REGIONS.map((r) => {
              const count = findingsByRegion[r.id] ?? 0;
              const fill =
                count > 0
                  ? 'fill-primary-200 dark:fill-primary-900/40 stroke-primary-500'
                  : 'fill-surface-100 dark:fill-surface-800 stroke-surface-300 dark:stroke-surface-600';
              return (
                <g key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                  <rect
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    rx={r.rx ?? 2}
                    className={`${fill} transition-colors hover:fill-primary-300 dark:hover:fill-primary-700/60`}
                    strokeWidth={0.5}
                  />
                  {count > 0 && (
                    <text
                      x={r.x + r.w / 2}
                      y={r.y + r.h / 2 + 1.5}
                      textAnchor="middle"
                      className="fill-primary-700 dark:fill-primary-200 text-[5px] font-bold pointer-events-none"
                    >
                      {count}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <p className="text-xs text-surface-500 mt-2">
            {t('bodyRegionChartHint', 'Click a region to record a finding.')}
          </p>
        </div>
      </Card>

      {findings.length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold mb-3">{t('bodyRegionFindings', 'Recorded findings')}</h4>
          <ul className="space-y-2">
            {findings.map((f) => (
              <li
                key={f.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-surface-200 dark:border-surface-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                      {t(`region${capitalize(f.region)}`, prettyRegion(f.region))}
                    </span>
                    {f.side && <span className="text-xs text-surface-500">{f.side}</span>}
                    {f.severity && <span className="text-xs text-surface-500">· {f.severity}</span>}
                  </div>
                  <p className="text-sm mt-1">{f.finding}</p>
                  {f.notes && <p className="text-xs text-surface-500 mt-1">{f.notes}</p>}
                  <p className="text-[10px] text-surface-400 mt-1">
                    {new Date(f.recordedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(t('confirmDelete', 'Delete this entry?'))) deleteFinding(f.id);
                  }}
                  aria-label={t('delete', 'Delete')}
                >
                  <X size={14} />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={close}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {t('addFindingFor', 'Add finding for')}{' '}
                <span className="text-primary-600">{t(selected.labelKey, selected.defaultLabel)}</span>
              </h3>
              <Button variant="ghost" size="sm" onClick={close} aria-label={t('close', 'Close')}>
                <X size={16} />
              </Button>
            </div>
            <div className="space-y-3">
              <Input
                label={t('finding', 'Finding')}
                value={finding}
                onChange={(e) => setFinding(e.target.value)}
                placeholder={t('findingPlaceholder', 'e.g. tenderness, swelling, lesion')}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-surface-500 mb-1">{t('side', 'Side')}</label>
                  <select
                    value={side}
                    onChange={(e) => setSide(e.target.value as BodyRegionSide | '')}
                    className="w-full rounded-xl border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 py-2 px-3 text-sm"
                  >
                    <option value="">—</option>
                    <option value="left">{t('sideLeft', 'Left')}</option>
                    <option value="right">{t('sideRight', 'Right')}</option>
                    <option value="center">{t('sideCenter', 'Center')}</option>
                    <option value="bilateral">{t('sideBilateral', 'Bilateral')}</option>
                  </select>
                </div>
                <Input label={t('severity', 'Severity')} value={severity} onChange={(e) => setSeverity(e.target.value)} placeholder="mild / moderate / severe" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-surface-500 mb-1">{t('notes', 'Notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={close}>{t('cancel', 'Cancel')}</Button>
                <Button onClick={handleSave} isLoading={isCreating} disabled={!finding.trim()}>
                  {t('save', 'Save')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

function capitalize(s: string): string {
  return s
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

function prettyRegion(s: string): string {
  return s.replace(/_/g, ' ');
}
