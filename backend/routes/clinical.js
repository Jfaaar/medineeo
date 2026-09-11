const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const ctrl = require('../controllers/clinicalController');

const router = express.Router();

router.use(authenticateToken);

// Clinical notes
router.get('/notes', asyncHandler(ctrl.listNotes));
router.get('/notes/:id', asyncHandler(ctrl.getNote));
router.post('/notes', asyncHandler(ctrl.createNote));
router.put('/notes/:id', asyncHandler(ctrl.updateNote));
router.post('/notes/:id/sign', asyncHandler(ctrl.signNote));
router.delete('/notes/:id', asyncHandler(ctrl.deleteNote));

module.exports = router;
