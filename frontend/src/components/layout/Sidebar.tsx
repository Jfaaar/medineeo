import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  Users,
  Settings,
  LayoutDashboard,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Clock,
  Package,
  Stethoscope,
  Pill,
  Tablets,
  Send,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';
import { useFeatureAccessApi } from '../../features/settings/useFeatureAccess';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../features/language/LanguageContext';
import { Logo } from '../ui/Logo';
import type { FeatureKey } from '../../lib/features';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  className?: string;
  onMobileClose?: () => void;
}

interface NavItem {
  id: string;
  label: any;
  icon: LucideIcon;
  /** Hide the item when the feature is disabled for the clinic OR the user lacks the feature's permission. */
  feature?: FeatureKey;
}

interface NavGroup {
  id: string;
  labelKey: any;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  className,
  onMobileClose,
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const featureApi = useFeatureAccessApi();
  const [isCollapsed, setIsCollapsed] = useState(true);

  // While features are loading, render the static structure rather than an
  // empty sidebar — saves a flash of an unstyled column on every page load.
  const visible = (item: NavItem): boolean => {
    if (!item.feature) return true;
    if (featureApi.isLoading) return true;
    if (user?.role === 'super_admin') return true;
    const { enabled, can } = featureApi.access(item.feature);
    return enabled && can;
  };

  const allGroups: NavGroup[] = [
    {
      id: 'overview',
      labelKey: 'overviewSection',
      items: [{ id: 'dashboard', label: 'dashboard', icon: LayoutDashboard, feature: 'dashboard' }],
    },
    {
      id: 'clinical',
      labelKey: 'clinicalSection',
      items: [
        { id: 'calendar', label: 'calendar', icon: Calendar, feature: 'calendar' },
        { id: 'waitingRoom', label: 'waitingRoom', icon: Clock, feature: 'waitingRoom' },
        { id: 'patients', label: 'patients', icon: Users, feature: 'patients' },
        { id: 'treatments', label: 'treatments', icon: Stethoscope, feature: 'treatments' },
        { id: 'prescriptions', label: 'prescriptions', icon: Pill, feature: 'prescriptions' },
        { id: 'certificates', label: 'certificates', icon: FileText, feature: 'certificates' },
        { id: 'referrals', label: 'referrals', icon: Send, feature: 'referrals' },
      ],
    },
    {
      id: 'operations',
      labelKey: 'operationsSection',
      items: [
        { id: 'invoices', label: 'invoices', icon: Receipt, feature: 'invoices' },
        { id: 'inventory', label: 'inventory', icon: Package, feature: 'inventory' },
        { id: 'medicaments', label: 'medicaments', icon: Tablets, feature: 'medicaments' },
      ],
    },
    {
      id: 'manage',
      labelKey: 'manageSection',
      items: [
        { id: 'team', label: 'team', icon: Users, feature: 'team' },
        { id: 'settings', label: 'settings', icon: Settings, feature: 'settings' },
      ],
    },
  ];

  const groups = allGroups
    .map((g) => ({ ...g, items: g.items.filter(visible) }))
    .filter((g) => g.items.length > 0);

  const handleNav = (id: string) => {
    onNavigate(id);
    if (onMobileClose) onMobileClose();
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (onMobileClose && window.innerWidth < 768) onMobileClose();
  };

  return (
    <aside
      className={cn(
        'bg-white dark:bg-surface-900 border-e border-surface-200 dark:border-surface-800 h-screen flex flex-col transition-all duration-300 ease-in-out relative z-30',
        isCollapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex items-center border-b border-surface-100 dark:border-surface-800 transition-all duration-300',
          isCollapsed ? 'p-4 justify-center' : 'p-5'
        )}
      >
        <Logo size={isCollapsed ? 'sm' : 'md'} showWordmark={!isCollapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {groups.map((group, gIdx) => (
          <div key={group.id} className={cn(gIdx > 0 && 'mt-4')}>
            {isCollapsed ? (
              gIdx > 0 && (
                <div className="mx-3 my-2 h-px bg-surface-200 dark:bg-surface-800" aria-hidden />
              )
            ) : (
              <p className="text-[11px] uppercase tracking-wider text-surface-400 dark:text-surface-500 font-semibold px-3 mb-1.5">
                {t(group.labelKey)}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    title={isCollapsed ? t(item.label) : ''}
                    className={cn(
                      'w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200 group relative',
                      isActive
                        ? 'bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-900/15 text-primary-700 dark:text-primary-200 shadow-soft'
                        : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white',
                      isCollapsed ? 'justify-center p-3' : 'justify-start gap-3 px-3.5 py-2.5'
                    )}
                  >
                    {isActive && (
                      <span
                        className="absolute start-0 top-1.5 bottom-1.5 w-[3px] rounded-e bg-gradient-to-b from-primary-500 to-accent-400"
                        aria-hidden
                      />
                    )}
                    <Icon
                      size={20}
                      className={cn(
                        'shrink-0 transition-colors',
                        isActive
                          ? 'text-primary-600 dark:text-primary-300'
                          : 'text-surface-400 dark:text-surface-500 group-hover:text-surface-600 dark:group-hover:text-surface-300'
                      )}
                    />
                    <span
                      className={cn(
                        'whitespace-nowrap transition-all duration-300 flex-1 text-start',
                        isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
                      )}
                    >
                      {t(item.label)}
                    </span>
                    {isActive && !isCollapsed && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-500 shrink-0" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-surface-100 dark:border-surface-800">
        {!isCollapsed && (
          <div className="px-3 pb-2 flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse-slow" aria-hidden />
            <span className="truncate">
              {user?.name ? `${user.name} · ${t('connected')}` : t('connected')}
            </span>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex w-full items-center justify-center p-2 text-surface-400 hover:text-primary-600 hover:bg-surface-50 dark:hover:bg-surface-800 rounded-lg transition-colors"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
};
