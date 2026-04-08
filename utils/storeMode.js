const MODE_ALIASES = {
    reservation: 'reserve',
    reserve: 'reserve',
    live: 'live',
    open: 'live',
    closed: 'closed',
    close: 'closed'
};

function normalizeStoreMode(mode) {
    if (!mode) return 'closed';
    const normalized = String(mode).trim().toLowerCase();
    return MODE_ALIASES[normalized] || 'closed';
}

function isReservationMode(mode) {
    return normalizeStoreMode(mode) === 'reserve';
}

module.exports = {
    normalizeStoreMode,
    isReservationMode
};
