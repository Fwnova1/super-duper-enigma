const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');

// Get statistics for all patients
router.get('/statistics', async (req, res) => {
  try {
    const stats = await Patient.aggregate([
      {
        $group: {
          _id: null,
          totalPatients: { $sum: 1 },
          avgBMI: { $avg: '$bmi' },
          minBMI: { $min: '$bmi' },
          maxBMI: { $max: '$bmi' },
          avgFeedVol: { $avg: '$feed_vol' },
          minFeedVol: { $min: '$feed_vol' },
          maxFeedVol: { $max: '$feed_vol' },
          avgEndTidalCO2: { $avg: '$end_tidal_co2' },
          minEndTidalCO2: { $min: '$end_tidal_co2' },
          maxEndTidalCO2: { $max: '$end_tidal_co2' },
          avgFiO2: { $avg: '$fio2' },
          minFiO2: { $min: '$fio2' },
          maxFiO2: { $max: '$fio2' },
          avgGlucose: { $avg: '$glucose' },
          minGlucose: { $min: '$glucose' },
          maxGlucose: { $max: '$glucose' },
          avgHeartRate: { $avg: '$heart_rate' },
          minHeartRate: { $min: '$heart_rate' },
          maxHeartRate: { $max: '$heart_rate' },
          avgO2Saturation: { $avg: '$o2_saturation' },
          minO2Saturation: { $min: '$o2_saturation' },
          maxO2Saturation: { $max: '$o2_saturation' },
          avgRespRate: { $avg: '$resp_rate' },
          minRespRate: { $min: '$resp_rate' },
          maxRespRate: { $max: '$resp_rate' },
          avgTemp: { $avg: '$temp' },
          minTemp: { $min: '$temp' },
          maxTemp: { $max: '$temp' },
          totalReferrals: {
            $sum: { $cond: ['$referral', 1, 0] }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        totalPatients: 0,
        avgBMI: 0,
        minBMI: 0,
        maxBMI: 0,
        avgFeedVol: 0,
        minFeedVol: 0,
        maxFeedVol: 0,
        avgEndTidalCO2: 0,
        minEndTidalCO2: 0,
        maxEndTidalCO2: 0,
        avgFiO2: 0,
        minFiO2: 0,
        maxFiO2: 0,
        avgGlucose: 0,
        minGlucose: 0,
        maxGlucose: 0,
        avgHeartRate: 0,
        minHeartRate: 0,
        maxHeartRate: 0,
        avgO2Saturation: 0,
        minO2Saturation: 0,
        maxO2Saturation: 0,
        avgRespRate: 0,
        minRespRate: 0,
        maxRespRate: 0,
        avgTemp: 0,
        minTemp: 0,
        maxTemp: 0,
        totalReferrals: 0
      });
    }

    res.json(stats[0]);
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 