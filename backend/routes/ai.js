const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Progress = require('../models/Progress');

// AI Coach responses
const aiResponses = {
  hydration: '💧 Aim for 3-4 liters of water daily. Add electrolytes (ORS) on heavy training days. Start each morning with warm honey lemon water for a metabolic boost!',
  protein: '🍗 High protein meal ideas:\n• Grilled chicken with quinoa and roasted veg\n• Greek yogurt bowl with berries and nuts\n• Tuna salad wrap with whole wheat\n• Egg white omelette with spinach and feta\n• Protein shake with oats and banana',
  plateau: '🤔 Struggling with a plateau? Try these:\n1. Recalculate your calories (maintenance drops as you lose weight)\n2. Increase protein to 1.2g/lb temporarily\n3. Add 10 min HIIT post-workout\n4. Ensure 8+ hours of sleep\n5. Consider a refeed day (eat at maintenance for 1-2 days)',
  supplements: '💊 Your current stack is solid:\n• Whey protein: Post-workout (2 scoops)\n• Creatine: 5g daily (any time)\n• Beta Alanine: 3.2g pre-workout\n• Citrulline Malate: 6-8g pre-workout\n• Omega-3: With meals\n• B-complex: Morning',
  motivation: '💪 You\'re doing great! Remember:\n• Progress is progress, no matter how small\n• Consistency beats perfection\n• Every workout counts\n• Trust the process\n• You are stronger than you think!'
};

// ============================================
// AI CHAT
// ============================================
router.post('/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a message'
      });
    }

    const lower = message.toLowerCase();
    let response;

    // Get personalized data
    const latest = await Progress.findOne({ userId: req.user._id })
      .sort({ date: -1 });

    // Check for specific intents
    if (lower.includes('water') || lower.includes('hydration') || lower.includes('drink')) {
      response = aiResponses.hydration;
    } else if (lower.includes('protein') || lower.includes('meal') || lower.includes('food') || lower.includes('eat')) {
      response = aiResponses.protein;
    } else if (lower.includes('plateau') || lower.includes('stuck') || lower.includes('not losing')) {
      response = aiResponses.plateau;
    } else if (lower.includes('supplement') || lower.includes('vitamin') || lower.includes('pill')) {
      response = aiResponses.supplements;
    } else if (lower.includes('motivate') || lower.includes('encourage') || lower.includes('keep going')) {
      response = aiResponses.motivation;
    } else if (lower.includes('progress') || lower.includes('how am i doing')) {
      if (latest) {
        response = `📊 Based on your last entry (${new Date(latest.date).toLocaleDateString()}):\n• Weight: ${latest.weight} kg\n• Calories: ${latest.calories || 'N/A'}\n• Protein: ${latest.protein || 'N/A'}g\n\nKeep up the great work! 💪`;
      } else {
        response = "You haven't logged any progress yet. Start tracking today to get personalized insights! 📊";
      }
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      response = `👋 Hello ${req.user.name}! How can I help you with your nutrition today? Feel free to ask about meals, supplements, hydration, motivation, or plateaus!`;
    } else if (lower.includes('thank')) {
      response = '😊 You\'re welcome! Keep up the great work on your fat loss journey. You\'ve got this!';
    } else {
      response = `🤔 That's a great question! Here's what I know about "${message}":\n\nEvidence-based nutrition advice:\n• Prioritize whole foods over processed\n• Eat protein with every meal (20-40g)\n• Include healthy fats (avocado, nuts, olive oil)\n• Complex carbs fuel your workouts\n• Consistency > perfection\n\nCan you rephrase or ask something more specific?`;
    }

    res.status(200).json({
      success: true,
      response
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

// ============================================
// GET PERSONALIZED RECOMMENDATION
// ============================================
router.get('/recommendation', auth, async (req, res) => {
  try {
    const entries = await Progress.find({ userId: req.user._id })
      .sort({ date: -1 })
      .limit(7);

    let recommendation = "Based on your recent data, here's my recommendation:\n\n";

    if (entries.length < 3) {
      recommendation += "📝 You have less than 3 entries. Consistency is key! Try to log your progress daily.\n\n";
      recommendation += "💡 Start with these habits:\n• Weigh yourself at the same time daily\n• Track your meals consistently\n• Stay hydrated (3-4L water daily)";
    } else {
      const avgWeight = entries.reduce((sum, e) => sum + e.weight, 0) / entries.length;
      const latest = entries[0];
      
      if (latest.weight > avgWeight) {
        recommendation += "⚖️ Your weight has slightly increased this week. Consider:\n";
        recommendation += "• Review your calorie intake\n• Increase your workout intensity\n• Check for water retention (salt intake)";
      } else if (latest.weight < avgWeight) {
        recommendation += "📉 Great progress! You're losing weight steadily.\n";
        recommendation += "• Keep doing what you're doing\n";
        recommendation += "• Maintain your current calorie deficit\n";
        recommendation += "• Ensure adequate protein intake (1g/lb body weight)";
      } else {
        recommendation += "➡️ Your weight is stable. To continue losing:\n";
        recommendation += "• Recalculate your maintenance calories\n";
        recommendation += "• Try incorporating HIIT workouts\n";
        recommendation += "• Consider intermittent fasting (16:8)";
      }

      // Protein check
      const avgProtein = entries.reduce((sum, e) => sum + (e.protein || 0), 0) / entries.length;
      if (avgProtein < 120) {
        recommendation += `\n\n💪 Your average protein intake is ${Math.round(avgProtein)}g. Aim for ${Math.round(req.user.currentWeight * 1)}g to preserve muscle mass.`;
      }
    }

    res.status(200).json({
      success: true,
      recommendation
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error.' 
    });
  }
});

module.exports = router;