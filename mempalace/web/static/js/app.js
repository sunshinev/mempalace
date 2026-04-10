/**
 * app.js — Shared utilities for MemPalace Web UI
 */

const API = {
    async get(url) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);
        return resp.json();
    },
    async post(url, data) {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);
        return resp.json();
    },
    async del(url) {
        const resp = await fetch(url, { method: 'DELETE' });
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);
        return resp.json();
    },
};

function showNotification(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `notification notification-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// Color palette for wings / predicates
const WING_COLORS = [
    '#e94560', '#0f3460', '#533483', '#00b4d8',
    '#f77f00', '#06d6a0', '#ef476f', '#118ab2',
    '#073b4c', '#ffd166', '#8338ec', '#fb5607',
];

function getWingColor(index) {
    return WING_COLORS[index % WING_COLORS.length];
}

/** Populate a <select> with wing options from the API */
async function populateWingSelect(selectId) {
    try {
        const data = await API.get('/api/wings');
        const sel = document.getElementById(selectId);
        if (!sel) return;
        const wings = data.wings || [];
        for (const w of wings) {
            const opt = document.createElement('option');
            opt.value = w.wing || w;
            opt.textContent = w.wing || w;
            sel.appendChild(opt);
        }
    } catch (e) {
        console.error('Failed to load wings:', e);
    }
}

/** Escape HTML to prevent XSS */
function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
