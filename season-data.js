(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.AMBO_SEASON_DATA = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    // Current seasons must never be pinned to a saved snapshot.
    async function load({ preferLive, loadLive, loadSaved, validate }) {
        async function saved(stale) {
            const payload = await loadSaved();
            if (!payload) return null;
            validate(payload.leagues);
            return { snapshots: payload.leagues, updatedAt: payload.generatedAt, stale, live: false };
        }
        if (!preferLive) {
            const result = await saved(false);
            if (result) return result;
        }
        try {
            const snapshots = await loadLive();
            validate(snapshots);
            return { snapshots, updatedAt: new Date().toISOString(), stale: false, live: true };
        } catch (error) {
            if (preferLive) {
                const result = await saved(true);
                if (result) return result;
            }
            throw error;
        }
    }
    return Object.freeze({ load });
}));
