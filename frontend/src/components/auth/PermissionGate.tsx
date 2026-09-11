// @ts-nocheck — Phase 3 UI shipped with type-shape divergence from canonical types in types.ts.
// TODO(phase 3 refactor): align this file with the schema-aligned ClinicalNote /
// TreatmentPlan / InsurancePolicy / InsuranceClaim shapes from supabase/migrations/0002.
import React from 'react';
import { hasPermission, PermissionKey } from '../../lib/permissions';
import { useAuth } from '../../features/auth/useAuth';

interface PermissionGateProps {
  permission: PermissionKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Renders children only when the current user holds the given permission.
 * Use for inline UI gating (e.g. hiding a "Sign" button from assistants).
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({ permission, fallback = null, children }) => {
  const { user } = useAuth();
  const allowed = hasPermission(user?.role, permission);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
};

interface RequirePermissionProps extends PermissionGateProps {
  /** Element rendered when the user lacks the permission. */
  deniedView?: React.ReactNode;
}

/**
 * Page-level guard. Renders children if allowed, otherwise renders deniedView
 * (default: a friendly access-denied message).
 */
export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission, children, deniedView,
}) => {
  const { user } = useAuth();
  const allowed = hasPermission(user?.role, permission);
  if (allowed) return <>{children}</>;
  if (deniedView !== undefined) return <>{deniedView}</>;
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
        <span className="text-3xl">🔒</span>
      </div>
      <h3 className="text-lg font-bold text-surface-900 dark:text-white">Access denied</h3>
      <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 max-w-sm">
        You don't have permission to view this page. Contact your clinic administrator if you think this is a mistake.
      </p>
    </div>
  );
};
