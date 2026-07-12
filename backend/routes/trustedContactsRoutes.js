// routes/trustedContactsRoutes.js


const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/trustedContactsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.list);
router.post('/', ctrl.add);
router.patch('/:contactId', ctrl.update);
router.delete('/:contactId', ctrl.remove);

module.exports = router;