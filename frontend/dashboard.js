// ============================================================
// DASHBOARD.JS - Complete Dashboard Logic
// ============================================================

const API_URL = 'http://localhost:5000/api';

// ---------- STATE ----------
const state = {
    entries: [],
    user: null,
    targetWeight: 65,
    startWeight: 80,
    currentChart: null,
    trendChart: null,
    analyticsWeightChart: null,
    calorieChart: null,
    macroChart: null
};

// ---------- DOM REFS ----------
const $ = id => document.getElementById(id);
const dom = {
    userName: $('userName'),
    userNameDisplay: $('userNameDisplay'),
    currentWeight: $('currentWeight'),
    weightChange: $('weightChange'),
    goalProgress: $('goalProgress'),
    goalRemaining: $('goalRemaining'),
    daysTracking: $('daysTracking'),
    avgLoss: $('avgLoss'),
    paceStatus: $('paceStatus'),
    trendBadge: $('trendBadge'),
    recentEntries: $('recentEntries'),
    logForm: $('logForm'),
    logDate: $('logDate'),
    logWeight: $('logWeight'),
    logCalories: $('logCalories'),
    logProtein: $('logProtein'),
    logCarbs: $('logCarbs'),
    logFat: $('logFat'),
    logWorkout: $('logWorkout'),
    logMood: $('logMood'),
    logNotes: $('logNotes'),
    clearAllData: $('clearAllData'),
    exportData: $('exportData'),
    resetChart: $('resetChart'),
    chatInput: $('chatInput'),
    sendMessage: $('sendMessage'),
    chatMessages: $('chatMessages'),
    weeklySummary: $('weeklySummary'),
    logoutBtn: $('logoutBtn')
};

// ============================================
// AUTH GUARD
// ============================================
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return token;
}

// ============================================
// API HELPERS
// ============================================
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
        throw new Error('Session expired. Please login again.');
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.message || 'API request failed');
    }
    return data;
}

// ============================================
// LOAD USER DATA
// ============================================
async function loadUser() {
    try {
        const data = await apiCall('/auth/me');
        state.user = data.user;
        state.targetWeight = data.user.targetWeight || 65;
        state.startWeight = data.user.currentWeight || 80;

        dom.userName.textContent = data.user.name;
        dom.userNameDisplay.textContent = data.user.name;
    } catch (error) {
        console.error('Load user error:', error);
    }
}

// ============================================
// LOAD PROGRESS DATA
// ============================================
async function loadProgress() {
    try {
        const data = await apiCall('/progress?limit=365');
        state.entries = data.entries.map(e => ({
            ...e,
            date: e.date.split('T')[0]
        }));
        // Sort by date
        state.entries.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (state.entries.length > 0) {
            state.startWeight = state.entries[0].weight;
        }

        updateDashboard();
        updateCharts();
        updateAnalytics();
    } catch (error) {
        console.error('Load progress error:', error);
        // Show empty state
        state.entries = [];
        updateDashboard();
    }
}

// ============================================
// DASHBOARD UPDATE
// ============================================
function updateDashboard() {
    const entries = state.entries;
    if (entries.length === 0) {
        dom.currentWeight.textContent = '-- kg';
        dom.weightChange.textContent = '0 kg lost';
        dom.goalProgress.textContent = '0%';
        dom.goalRemaining.textContent = '-- kg to go';
        dom.daysTracking.textContent = '0';
        dom.avgLoss.textContent = '0 kg';
        dom.paceStatus.textContent = 'No data';
        dom.recentEntries.innerHTML = '<p class="empty-state">No entries yet. Start tracking today!</p>';
        return;
    }

    const last = entries[entries.length - 1];
    const first = entries[0];
    const currentWeight = last.weight;
    const startWeight = first.weight;
    const totalLost = startWeight - currentWeight;
    const goalRemaining = state.targetWeight - currentWeight;

    dom.currentWeight.textContent = currentWeight + ' kg';
    dom.weightChange.textContent = (totalLost >= 0 ? '' : '') + totalLost.toFixed(1) + ' kg ' + (totalLost >= 0 ? 'lost' : 'gained');
    dom.weightChange.className = 'stat-change ' + (totalLost >= 0 ? 'positive' : 'negative');

    const totalToLose = startWeight - state.targetWeight;
    const progress = totalToLose > 0 ? Math.min(100, (totalLost / totalToLose) * 100) : 0;
    dom.goalProgress.textContent = Math.round(progress) + '%';
    dom.goalRemaining.textContent = Math.max(0, goalRemaining).toFixed(1) + ' kg to go';

    const days = Math.ceil((new Date() - new Date(first.date)) / (1000 * 60 * 60 * 24)) + 1;
    dom.daysTracking.textContent = days;

    const weeks = days / 7;
    const avgLoss = weeks > 0 ? totalLost / weeks : 0;
    dom.avgLoss.textContent = avgLoss.toFixed(2) + ' kg';

    const paceStatus = dom.paceStatus;
    if (weeks > 0 && avgLoss > 0.9) {
        paceStatus.textContent = '🔥 Ahead of target';
        paceStatus.style.color = '#FF9800';
    } else if (weeks > 0 && avgLoss > 0.5) {
        paceStatus.textContent = '✅ On track';
        paceStatus.style.color = '#4CAF50';
    } else if (weeks > 0 && avgLoss > 0.2) {
        paceStatus.textContent = '⚠️ Slightly behind';
        paceStatus.style.color = '#FFC107';
    } else if (weeks > 0) {
        paceStatus.textContent = '🔴 Needs improvement';
        paceStatus.style.color = '#f44336';
    } else {
        paceStatus.textContent = 'Just getting started!';
        paceStatus.style.color = '#4CAF50';
    }

    const badge = dom.trendBadge;
    if (entries.length > 3) {
        const recent = entries.slice(-7);
        const weights = recent.map(e => e.weight);
        const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
        const lastWeight = weights[weights.length - 1];
        const diff = lastWeight - avg;
        if (diff < -0.3) {
            badge.textContent = '📉 Losing fast';
            badge.className = 'badge ahead';
        } else if (diff < -0.1) {
            badge.textContent = '📉 Losing';
            badge.className = 'badge on-track';
        } else if (diff < 0.1) {
            badge.textContent = '➡️ Stable';
            badge.className = 'badge';
        } else if (diff < 0.3) {
            badge.textContent = '📈 Gaining';
            badge.className = 'badge behind';
        } else {
            badge.textContent = '📈 Gaining fast';
            badge.className = 'badge behind';
        }
    }

    renderRecentEntries();
}

function renderRecentEntries() {
    const entries = state.entries;
    if (entries.length === 0) {
        dom.recentEntries.innerHTML = '<p class="empty-state">No entries yet. Start tracking today!</p>';
        return;
    }

    const recent = entries.slice(-10).reverse();
    dom.recentEntries.innerHTML = recent.map(entry => `
        <div class="entry-item">
            <span class="entry-date">${formatDate(entry.date)}</span>
            <span class="entry-weight">${entry.weight} kg</span>
            <span class="entry-notes">${entry.notes || '—'}</span>
            <button class="entry-delete" data-id="${entry._id}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

    document.querySelectorAll('.entry-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (confirm('Delete this entry?')) {
                try {
                    await apiCall(`/progress/${id}`, { method: 'DELETE' });
                    await loadProgress();
                } catch (error) {
                    alert('Failed to delete entry.');
                }
            }
        });
    });
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// CHARTS
// ============================================
function updateCharts() {
    const entries = state.entries;
    if (entries.length === 0) return;

    const labels = entries.map(e => formatDate(e.date));
    const weights = entries.map(e => e.weight);

    const ctx = document.getElementById('weightChart').getContext('2d');
    if (state.currentChart) state.currentChart.destroy();

    state.currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Weight (kg)',
                data: weights,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: weights.map(w => w <= state.targetWeight ? '#FF9800' : '#4CAF50'),
                pointRadius: 4
            }, {
                label: 'Target Weight',
                data: Array(weights.length).fill(state.targetWeight),
                borderColor: '#FF9800',
                borderDash: [8, 4],
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#b0b8c8' } },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.parsed.y + ' kg'
                    }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0b8c8', maxTicksLimit: 15 } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0b8c8' } }
            }
        }
    });

    const trendCtx = document.getElementById('trendChart').getContext('2d');
    if (state.trendChart) state.trendChart.destroy();

    const ma7 = calculateMovingAverage(weights, 7);
    state.trendChart = new Chart(trendCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Daily Weight',
                data: weights,
                backgroundColor: 'rgba(76, 175, 80, 0.3)',
                borderColor: '#4CAF50',
                borderWidth: 1,
                borderRadius: 4
            }, {
                label: '7-Day Avg',
                data: ma7,
                type: 'line',
                borderColor: '#FF9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#b0b8c8' } }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0b8c8', maxTicksLimit: 15 } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0b8c8' } }
            }
        }
    });
}

function calculateMovingAverage(data, window) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - window + 1);
        const slice = data.slice(start, i + 1);
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
        result.push(avg);
    }
    return result;
}

// ============================================
// ANALYTICS
// ============================================
function updateAnalytics() {
    const entries = state.entries;
    if (entries.length === 0) return;

    const labels = entries.map(e => formatDate(e.date));
    const weights = entries.map(e => e.weight);
    const calories = entries.map(e => e.calories || 0);
    const protein = entries.map(e => e.protein || 0);
    const carbs = entries.map(e => e.carbs || 0);
    const fat = entries.map(e => e.fat || 0);

    const wCtx = document.getElementById('analyticsWeightChart').getContext('2d');
    if (state.analyticsWeightChart) state.analyticsWeightChart.destroy();
    state.analyticsWeightChart = new Chart(wCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Weight', data: weights, borderColor: '#4CAF50', tension: 0.3, pointRadius: 2 },
                { label: 'Target', data: Array(weights.length).fill(state.targetWeight), borderColor: '#FF9800', borderDash: [6, 4], pointRadius: 0 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#b0b8c8' } } },
            scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0b8c8' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0b8c8' } } }
        }
    });

    const cCtx = document.getElementById('calorieChart').getContext('2d');
    if (state.calorieChart) state.calorieChart.destroy();
    state.calorieChart = new Chart(cCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Calories',
                data: calories,
                backgroundColor: calories.map(c => c > 2400 ? 'rgba(244, 67, 54, 0.6)' : 'rgba(76, 175, 80, 0.6)'),
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#b0b8c8' } } },
            scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0b8c8' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0b8c8' } } }
        }
    });

    const mCtx = document.getElementById('macroChart').getContext('2d');
    if (state.macroChart) state.macroChart.destroy();
    const last = entries[entries.length - 1];
    state.macroChart = new Chart(mCtx, {
        type: 'doughnut',
        data: {
            labels: ['Protein', 'Carbs', 'Fat'],
            datasets: [{
                data: [last.protein || 0, last.carbs || 0, last.fat || 0],
                backgroundColor: ['#4CAF50', '#FF9800', '#2196F3'],
                borderColor: '#141b2d',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#b0b8c8' } },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            return ctx.label + ': ' + ctx.parsed + 'g (' + Math.round((ctx.parsed / total) * 100) + '%)';
                        }
                    }
                }
            }
        }
    });

    renderWeeklySummary();
}

function renderWeeklySummary() {
    const entries = state.entries;
    if (entries.length < 2) {
        dom.weeklySummary.innerHTML = '<p>Log more data to see insights!</p>';
        return;
    }

    const recent = entries.slice(-7);
    const totalCal = recent.reduce((s, e) => s + (e.calories || 0), 0);
    const avgCal = Math.round(totalCal / recent.length);
    const totalProtein = recent.reduce((s, e) => s + (e.protein || 0), 0);
    const avgProtein = Math.round(totalProtein / recent.length);
    const start = recent[0]?.weight || 0;
    const end = recent[recent.length - 1]?.weight || 0;
    const change = (end - start).toFixed(1);

    dom.weeklySummary.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div><strong>Avg Calories</strong><br><span style="font-size:1.4rem;">${avgCal}</span></div>
            <div><strong>Avg Protein</strong><br><span style="font-size:1.4rem;">${avgProtein}g</span></div>
            <div><strong>Weight Change (7d)</strong><br><span style="font-size:1.4rem;color:${change < 0 ? '#4CAF50' : '#f44336'};">${change} kg</span></div>
            <div><strong>Entries</strong><br><span style="font-size:1.4rem;">${recent.length}/7 days</span></div>
        </div>
    `;
}

// ============================================
// LOG FORM
// ============================================
dom.logForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const date = dom.logDate.value;
    const weight = parseFloat(dom.logWeight.value);
    const calories = parseInt(dom.logCalories.value) || 0;
    const protein = parseInt(dom.logProtein.value) || 0;
    const carbs = parseInt(dom.logCarbs.value) || 0;
    const fat = parseInt(dom.logFat.value) || 0;
    const workout = dom.logWorkout.value;
    const mood = dom.logMood.value;
    const notes = dom.logNotes.value.trim();

    if (!date || !weight) {
        alert('Please fill in at least the date and weight.');
        return;
    }

    try {
        await apiCall('/progress', {
            method: 'POST',
            body: JSON.stringify({ date, weight, calories, protein, carbs, fat, workout, mood, notes })
        });

        dom.logForm.reset();
        dom.logDate.value = date;
        await loadProgress();

        const btn = dom.logForm.querySelector('.btn-primary');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
        setTimeout(() => btn.innerHTML = orig, 2000);

        document.querySelector('[data-tab="dashboard"]').click();

    } catch (error) {
        alert('Failed to save entry: ' + error.message);
    }
});

dom.logDate.value = new Date().toISOString().split('T')[0];

// ============================================
// CLEAR & EXPORT
// ============================================
dom.clearAllData.addEventListener('click', () => {
    if (confirm('Delete ALL data? This cannot be undone!')) {
        if (confirm('Are you absolutely sure?')) {
            // We don't have a bulk delete API, so we'll delete one by one
            // This is a simplified version
            alert('Please delete entries individually from the dashboard.');
        }
    }
});

dom.exportData.addEventListener('click', () => {
    if (state.entries.length === 0) {
        alert('No data to export.');
        return;
    }
    const data = JSON.stringify(state.entries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitTrack_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

dom.resetChart.addEventListener('click', () => {
    updateCharts();
});

// ============================================
// AI COACH
// ============================================
async function sendChatMessage() {
    const input = dom.chatInput.value.trim();
    if (!input) return;

    // Add user message
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    userDiv.innerHTML = `<div class="message-content">${escapeHtml(input)}</div>`;
    dom.chatMessages.appendChild(userDiv);

    dom.chatInput.value = '';
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;

    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `<div class="message-content">Typing<span class="typing-dots">...</span></div>`;
    dom.chatMessages.appendChild(typingDiv);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;

    try {
        const data = await apiCall('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ message: input })
        });

        // Remove typing indicator
        document.getElementById('typingIndicator')?.remove();

        const botDiv = document.createElement('div');
        botDiv.className = 'message bot';
        botDiv.innerHTML = `<div class="message-content">${escapeHtml(data.response)}</div>`;
        dom.chatMessages.appendChild(botDiv);

    } catch (error) {
        document.getElementById('typingIndicator')?.remove();
        const botDiv = document.createElement('div');
        botDiv.className = 'message bot';
        botDiv.innerHTML = `<div class="message-content">Sorry, I couldn't process your request. Please try again.</div>`;
        dom.chatMessages.appendChild(botDiv);
    }

    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

dom.sendMessage.addEventListener('click', sendChatMessage);
dom.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        dom.chatInput.value = btn.dataset.question;
        sendChatMessage();
    });
});

// ============================================
// NAVIGATION
// ============================================
document.querySelectorAll('[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('[data-tab]').forEach(el => el.classList.remove('active'));
        $(tab).classList.add('active');
        link.classList.add('active');
        document.querySelector('.nav-menu').classList.remove('active');
    });
});

document.querySelector('.nav-toggle').addEventListener('click', () => {
    document.querySelector('.nav-menu').classList.toggle('active');
});

// ============================================
// LOGOUT
// ============================================
dom.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
});

// ============================================
// INIT
// ============================================
async function init() {
    if (!checkAuth()) return;

    try {
        await loadUser();
        await loadProgress();
    } catch (error) {
        console.error('Init error:', error);
    }

    // Load recommendation
    try {
        const data = await apiCall('/ai/recommendation');
        // Add as a message in AI chat
        const botDiv = document.createElement('div');
        botDiv.className = 'message bot';
        botDiv.innerHTML = `<div class="message-content"><strong>📊 Daily Recommendation</strong>\n\n${escapeHtml(data.recommendation)}</div>`;
        dom.chatMessages.appendChild(botDiv);
    } catch (error) {
        console.log('Recommendation not available yet');
    }
}

// Add typing animation CSS
const style = document.createElement('style');
style.textContent = `
    .typing-dots {
        display: inline-block;
        animation: dots 1.4s infinite;
    }
    @keyframes dots {
        0%, 20% { content: ''; }
        40% { content: '.'; }
        60% { content: '..'; }
        80%, 100% { content: '...'; }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', init);