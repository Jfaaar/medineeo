// Specialty / feature gate. Use after authenticateToken on any route whose
// availability depends on the clinic's enabled features.
//
//   router.use('/vaccinations', requireFeature('vaccinations'));
//
// Returns 403 with a structured envelope if the feature is disabled for the
// current clinic. The check consults clinic_feature_overrides first, then
// falls back to feature_definitions.default_specialties ∩ clinic_settings.enabled_specialties.

const repo = require('../repositories/featuresRepository');
const { isFeatureKey } = require('../lib/features');

function requireFeature(featureKey) {
  if (!isFeatureKey(featureKey)) {
    throw new Error(`requireFeature(): unknown feature_key '${featureKey}'`);
  }
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      }
      // super_admin bypasses tenant feature gates (cross-clinic backoffice work).
      if (req.user.role === 'super_admin') return next();

      if (!req.user.clinicId) {
        return res.status(400).json({
          error: { code: 'MISSING_CLINIC', message: 'User has no associated clinic' },
        });
      }
      const enabled = await repo.isFeatureEnabled(req.db, req.user.clinicId, featureKey);
      if (!enabled) {
        return res.status(403).json({
          error: {
            code: 'FEATURE_DISABLED',
            message: `Feature '${featureKey}' is not enabled for this clinic`,
            details: { featureKey },
          },
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireFeature };
