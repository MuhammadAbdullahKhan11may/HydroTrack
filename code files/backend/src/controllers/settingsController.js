import { db } from '../../dist/src/prisma/db.js';

/* =========================================================
   GET USER SETTINGS
   GET /api/settings
   ========================================================= */

export const getSettings = async (req, res) => {
  try {
    const userId = req.userId;

    const settings = await db.orm.public.UserSettings
      .where({
        userId: userId
      })
      .first();

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'User settings not found.'
      });
    }

    return res.status(200).json({
      success: true,
      settings: {
        dailyGoal: settings.dailyGoal,
        servingSize: settings.servingSize,
        measurementUnit: settings.measurementUnit
      }
    });

  } catch (error) {
    console.error('Get settings error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve settings.'
    });
  }
};
/* =========================================================
   UPDATE USER SETTINGS
   PUT /api/settings
   ========================================================= */

export const updateSettings = async (req, res) => {
  try {
    const userId = req.userId;
    const { dailyGoal, servingSize, measurementUnit } = req.body;

    // Daily goal validation
    if (
      typeof dailyGoal !== 'number' ||
      !Number.isInteger(dailyGoal) ||
      dailyGoal < 500 ||
      dailyGoal > 8000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Daily goal must be a whole number between 500 and 8,000 ml.'
      });
    }

    // Serving size validation
    if (![250, 500].includes(servingSize)) {
      return res.status(400).json({
        success: false,
        message: 'Serving size must be either 250 ml or 500 ml.'
      });
    }

    // Measurement unit validation
    if (!['ml', 'L'].includes(measurementUnit)) {
      return res.status(400).json({
        success: false,
        message: 'Measurement unit must be ml or L.'
      });
    }

    const existingSettings = await db.orm.public.UserSettings
      .where({
        userId: userId
      })
      .first();

    if (!existingSettings) {
      return res.status(404).json({
        success: false,
        message: 'User settings not found.'
      });
    }

    const settings = await db.orm.public.UserSettings
      .where({
        id: existingSettings.id
      })
      .update({
        dailyGoal: dailyGoal,
        servingSize: servingSize,
        measurementUnit: measurementUnit
      });

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully.',
      settings: {
        dailyGoal: settings.dailyGoal,
        servingSize: settings.servingSize,
        measurementUnit: settings.measurementUnit
      }
    });

  } catch (error) {
    console.error('Update settings error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update settings.'
    });
  }
};