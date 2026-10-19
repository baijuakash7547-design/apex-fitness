// ── Shared frontend utilities ────────────────────────────────────────────────

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character]);
}

function localDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calendarDayDifference(fromKey, toKey) {
    const parse = key => {
        const [year, month, day] = String(key).split('-').map(Number);
        return Date.UTC(year, month - 1, day);
    };
    const from = parse(fromKey);
    const to = parse(toKey);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
    return Math.round((to - from) / 86400000);
}
