const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireFeature } = require('../middleware/featureGuard');
const { asyncHandler } = require('../utils/asyncHandler');
const ctrl = require('../controllers/certificatesController');

const router = express.Router();

router.use(authenticateToken);
router.use(requireFeature('certificates'));

router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.get));
router.post('/', asyncHandler(ctrl.create));
router.put('/:id', asyncHandler(ctrl.update));
router.post('/:id/sign', asyncHandler(ctrl.sign));
router.delete('/:id', asyncHandler(ctrl.remove));

module.exports = router;
