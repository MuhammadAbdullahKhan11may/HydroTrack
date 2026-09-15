import { db } from '../../dist/src/prisma/db.js';

/* =========================================================
   DATE VALIDATION HELPER
   ========================================================= */

const isValidDate = (date) => {
  if (typeof date !== 'string') {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
};


/* =========================================================
   GET TODAY'S HYDRATION
   GET /api/hydration/today
   ========================================================= */

export const getTodayHydration = async (req, res) => {
  try {
    const userId = req.userId;

    // Date is supplied by the frontend using the user's local date.
    const date = req.query.date;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required.'
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid date using YYYY-MM-DD format.'
      });
    }

    const record = await db.orm.public.HydrationRecord
      .where({
        userId: userId,
        date: date
      })
      .first();

    return res.status(200).json({
      success: true,
      hydration: {
        date: date,
        waterIntake: record ? record.waterIntake : 0
      }
    });

  } catch (error) {
    console.error('Get today hydration error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve hydration data.'
    });
  }
};


/* =========================================================
   SAVE / UPDATE HYDRATION
   POST /api/hydration
   ========================================================= */

export const saveHydration = async (req, res) => {
  try {
    const userId = req.userId;
    const { date, waterIntake } = req.body;

    // -------------------------
    // Validate date
    // -------------------------

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required.'
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid date using YYYY-MM-DD format.'
      });
    }

    // -------------------------
    // Validate water intake
    // -------------------------

    if (
      typeof waterIntake !== 'number' ||
      !Number.isInteger(waterIntake)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Water intake must be a whole number.'
      });
    }

    if (waterIntake < 0 || waterIntake > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Water intake must be between 0 and 10,000 ml.'
      });
    }

    // -------------------------
    // Find existing record
    // -------------------------

    const existingRecord = await db.orm.public.HydrationRecord
      .where({
        userId: userId,
        date: date
      })
      .first();

    let record;

    // -------------------------
    // Update or create record
    // -------------------------

    if (existingRecord) {
      record = await db.orm.public.HydrationRecord
        .where({
          id: existingRecord.id
        })
        .update({
          waterIntake: waterIntake
        });

    } else {
      record = await db.orm.public.HydrationRecord.create({
        userId: userId,
        date: date,
        waterIntake: waterIntake
      });
    }

    return res.status(existingRecord ? 200 : 201).json({
      success: true,
      hydration: {
        date: record.date,
        waterIntake: record.waterIntake
      }
    });

  } catch (error) {
    console.error('Save hydration error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to save hydration data.'
    });
  }
};


/* =========================================================
   GET HYDRATION HISTORY
   GET /api/hydration
   ========================================================= */

export const getHydrationHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const records = await db.orm.public.HydrationRecord
      .where({
        userId: userId
      })
      .all();

    const hydration = records
      .map(function (record) {
        return {
          date: record.date,
          waterIntake: record.waterIntake
        };
      })
      .sort(function (a, b) {
        return a.date.localeCompare(b.date);
      });

    return res.status(200).json({
      success: true,
      hydration: hydration
    });

  } catch (error) {
    console.error('Get hydration history error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve hydration history.'
    });
  }
};


/* =========================================================
   DELETE TODAY'S HYDRATION
   DELETE /api/hydration/today
   ========================================================= */

export const deleteTodayHydration = async (req, res) => {
  try {
    const userId = req.userId;
    const date = req.query.date;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required.'
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid date using YYYY-MM-DD format.'
      });
    }

    const existingRecord = await db.orm.public.HydrationRecord
      .where({
        userId: userId,
        date: date
      })
      .first();

    // Resetting an already-empty day is still considered successful.
    if (!existingRecord) {
      return res.status(200).json({
        success: true,
        message: 'Hydration progress is already empty.',
        hydration: {
          date: date,
          waterIntake: 0
        }
      });
    }

    await db.orm.public.HydrationRecord
      .where({
        id: existingRecord.id
      })
      .delete();

    return res.status(200).json({
      success: true,
      message: 'Hydration progress reset successfully.',
      hydration: {
        date: date,
        waterIntake: 0
      }
    });

  } catch (error) {
    console.error('Delete hydration error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to reset hydration progress.'
    });
  }
};