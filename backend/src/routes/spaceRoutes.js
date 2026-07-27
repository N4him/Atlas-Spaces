const express = require('express');
const {
  listSpaces,
  getSpace,
  createSpace,
  updateSpace,
  deactivateSpace,
  reactivateSpace,
} = require('../controllers/spaceController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', listSpaces);
router.get('/:id', getSpace);

// Solo administrador puede crear, editar o desactivar/reactivar espacios
router.post('/', requireRole('admin'), createSpace);
router.put('/:id', requireRole('admin'), updateSpace);
router.patch('/:id/deactivate', requireRole('admin'), deactivateSpace);
router.patch('/:id/reactivate', requireRole('admin'), reactivateSpace);

module.exports = router;
