import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { usePermissions } from '@/features/auth/usePermissions';
import { useFeatureAccessApi } from '@/features/settings/useFeatureAccess';
import type { Permission } from '../../lib/permissions';
import type { UserRole } from '../../types';
import type { FeatureKey } from '../../lib/features';
import { ROUTES } from '../constants/routes';

const FullScreenLoader: React.FC = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-surface-50 dark:bg-surface-900">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
  </div>
);

export interface ProtectedRouteProps {
  /** If set, only these roles may pass. */
  roles?: UserRole[];
  /** If set, the user must hold this single permission (effective, with overrides). */
  permission?: Permission;
  /** If set, the user must hold at least one of these permissions. */
  anyPermissionOf?: Permission[];
  /** If set, the feature must be enabled for the current clinic. */
  feature?: FeatureKey;
  /** Where to send unauthenticated users. Defaults to /login. */
  loginRedirect?: string;
  /** Where to send authenticated users who fail role/permission/feature checks. */
  forbiddenRedirect?: string;
}

/**
 * Single Outlet-based gate for auth + role + permission + feature checks.
 *
 *   <Route element={<ProtectedRoute roles={['doctor']} feature="vaccinations" />}>
 *     <Route path="/foo" element={<Foo />} />
 *   </Route>
 *
 * When `feature` is set, we wait for the /features query to resolve before
 * deciding — otherwise a fast redirect-on-mount would race the query and
 * send the user to dashboard even though their clinic has the feature.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  roles,
  permission,
  anyPermissionOf,
  feature,
  loginRedirect = ROUTES.auth.login,
  forbiddenRedirect = ROUTES.app.dashboard,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const { can, canAny } = usePermissions();
  const { isFeatureEnabled, isLoading: isFeaturesLoading } = useFeatureAccessApi();

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated || !user) {
    return <Navigate to={loginRedirect} replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role as UserRole)) {
    return <Navigate to={forbiddenRedirect} replace />;
  }

  const permOk =
    (!permission || can(permission)) && (!anyPermissionOf || canAny(anyPermissionOf));
  if (!permOk) {
    return <Navigate to={forbiddenRedirect} replace />;
  }

  if (feature) {
    if (isFeaturesLoading) return <FullScreenLoader />;
    // super_admin bypasses tenant feature gates.
    if (user.role !== 'super_admin' && !isFeatureEnabled(feature)) {
      return <Navigate to={forbiddenRedirect} replace />;
    }
  }

  return <Outlet />;
};
