const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

// Rutas base: /api/campaigns
router.get('/', campaignController.getCampaigns);
router.get('/active', campaignController.getActiveCampaign);
router.post('/', campaignController.createCampaign);
router.put('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);

module.exports = router;
