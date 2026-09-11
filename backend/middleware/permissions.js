// Role / permission middleware. Use after authenticateToken.
//
// Two permission gates coexist:
//
//   requirePermission(...perms)
//       Legacy coarse server permissions (clinic:create, patient:write, …).
//       Static matrix in lib/permissions.js. No per-clinic overrides.
//
//   requireEffectivePermission(...perms)
//       Fine-grained, dotted-namespace permissions shared with the frontend
//       (clinical.sign, treatments.accept, payments.refund, …). The static
//       ROLE_PERMISSIONS matrix in lib/rolePermissions.js is the default,
//       but per-clinic role_permission_overrides take precedence.
//       Use this on new clinical/admin routes.

const { hasPermission, hasAnyRole } = require('../lib/permissions');
const featuresRepo = require('../repositories/featuresRepository');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!hasAnyRole(req.user.role, roles)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function requirePermission(...perms) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const ok = perms.every((p) => hasPermission(req.user.role, p));
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function requireEffectivePermission(...perms) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      }
      if (req.user.role === 'super_admin') return next();
      if (!req.user.clinicId) {
        return res.status(400).json({
          error: { code: 'MISSING_CLINIC', message: 'User has no associated clinic' },
        });
      }
      for (const p of perms) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await featuresRepo.hasEffectivePermission(
          req.db,
          req.user.clinicId,
          req.user.role,
          p,
        );
        if (!ok) {
          return res.status(403).json({
            error: {
              code: 'PERMISSION_DENIED',
              message: `Missing permission '${p}'`,
              details: { permission: p },
            },
          });
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireRole, requirePermission, requireEffectivePermission };
