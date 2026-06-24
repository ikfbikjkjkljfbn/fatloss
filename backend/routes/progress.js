const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Progress = require('../models/Progress');

// ============================================
// ADD PROGRESS ENTRY
// ============================================
router.post('/', auth, async (req, res) => {
  try {
    const { date, weight, calories, protein, carbs, fat, workout, workoutDuration, sleepHours, waterIntake, notes, mood } = req.body;

    // Check if entry exists for this date
    let entry = await Progress.findOne({
      userId: req.user._id,
      date: date || new Date()
    });

    if (entry) {
      // Update existing entry
      entry.weight = weight || entry.weight;
      entry.calories = calories || entry.calories;
      entry.protein = protein || entry.protein;
      entry.carbs = carbs || entry.carbs;
      entry.fat = fat || entry.fat;
      entry.workout = workout || entry.workout;
      entry.workoutDuration = workoutDuration || entry.workoutDuration;
      entry.sleepHours = sleepHours || entry.sleepHours;
      entry.waterIntake = waterIntake || entry.waterIntake;
      entry.notes = notes || entry.notes;
      entry.mood = mood || entry.mood;
      await entry.save();
      
      return res.status(200).json({
        success: true,
        message: 'Progress updated successfully!',
        entry
      });
    }

    // Create new entry
    entry = new Progress({
      userId: req.user._id,
      date: date || new Date(),
      weight,
      calories,
      protein,
      carbs,
      fat,
      workout,
      workoutDuration,
      sleepHours,
      waterIntake,
      notes,
      mood
    });

    await entry.save();

    res.status(201).json({
      success: true,
      message: 'Progress logged successfully!',
      entry
    });

  } catch (error) {
    console.error('Add progress error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

// ============================================
// GET ALL PROGRESS (with pagination)
// ============================================
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 100, skip = 0 } = req.query;

    const entries = await Progress.find({ userId: req.user._id })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Progress.countDocuments({ userId: req.user._id });

    res.status(200).json({
      success: true,
      entries,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: skip + entries.length < total
      }
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// ============================================
// GET PROGRESS BY DATE RANGE
// ============================================
router.get('/range', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }

    const entries = await Progress.find({
      userId: req.user._id,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ date: 1 });

    res.status(200).json({
      success: true,
      entries
    });

  } catch (error) {
    console.error('Get progress range error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// ============================================
// GET LATEST PROGRESS
// ============================================
router.get('/latest', auth, async (req, res) => {
  try {
    const entry = await Progress.findOne({ userId: req.user._id })
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      entry
    });

  } catch (error) {
    console.error('Get latest progress error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// ============================================
// DELETE PROGRESS ENTRY
// ============================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const entry = await Progress.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    await entry.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete progress error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

// ============================================
// GET STATS
// ============================================
router.get('/stats', auth, async (req, res) => {
  try {
    const entries = await Progress.find({ userId: req.user._id })
      .sort({ date: 1 });

    if (entries.length === 0) {
      return res.status(200).json({
        success: true,
        stats: {
          totalEntries: 0,
          startWeight: null,
          currentWeight: null,
          totalLost: 0,
          avgCalories: 0,
          avgProtein: 0,
          avgCarbs: 0,
          avgFat: 0,
          bestWeek: null,
          workoutFrequency: 0
        }
      });
    }

    const first = entries[0];
    const last = entries[entries.length - 1];
    const totalLost = first.weight - last.weight;

    // Calculate averages
    const totalCal = entries.reduce((sum, e) => sum + (e.calories || 0), 0);
    const totalProtein = entries.reduce((sum, e) => sum + (e.protein || 0), 0);
    const totalCarbs = entries.reduce((sum, e) => sum + (e.carbs || 0), 0);
    const totalFat = entries.reduce((sum, e) => sum + (e.fat || 0), 0);
    const count = entries.length;

    // Workout frequency
    const workoutDays = entries.filter(e => e.workout && e.workout !== 'rest').length;
    const workoutFrequency = (workoutDays / count * 100).toFixed(1);

    res.status(200).json({
      success: true,
      stats: {
        totalEntries: count,
        startWeight: first.weight,
        currentWeight: last.weight,
        totalLost: parseFloat(totalLost.toFixed(1)),
        avgCalories: Math.round(totalCal / count),
        avgProtein: Math.round(totalProtein / count),
        avgCarbs: Math.round(totalCarbs / count),
        avgFat: Math.round(totalFat / count),
        bestWeek: 'Coming soon',
        workoutFrequency: parseFloat(workoutFrequency)
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

module.exports = router;