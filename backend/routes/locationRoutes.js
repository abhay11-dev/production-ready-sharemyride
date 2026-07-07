const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

router.get('/search', locationController.searchLocation);

module.exports = router;
