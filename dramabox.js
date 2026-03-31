'use strict';

const BASE_URL = 'https://api.sansekai.my.id/api/dramabox';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 jam

// ─── Optimized In-Memory Cache (Stale-While-Revalidate) ────────────

const _cache = new Map();

// Pembersihan cache otomatis di latar belakang setiap 1 jam agar RAM tidak bocor
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of _cache.entries()) {
        if (now > entry.expiresAt) _cache.delete(key);
    }
}, CACHE_TTL_MS).unref(); 

async function _fetchAndCache(path, cacheKey) {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { accept: '*/*' },
    });
    if (!res.ok) throw new Error(`DramaBox API error ${res.status}: ${path}`);
    
    const data = await res.json();
    _cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
}

async function _request(path, cacheKey) {
    const entry = _cache.get(cacheKey);
    const now = Date.now();

    if (entry) {
        if (now > entry.expiresAt) {
            // SWR: Kembalikan data lama secara instan, fetch data baru di background
            _fetchAndCache(path, cacheKey).catch(err => console.error('SWR Error:', err));
            return entry.data; 
        }
        return entry.data; // Cache masih sangat segar
    }

    // Belum ada cache sama sekali, tunggu fetch selesai
    return await _fetchAndCache(path, cacheKey);
}

function clearCache(key = null) {
    if (key) _cache.delete(key);
    else _cache.clear();
}

function cacheInfo() {
    const now = Date.now();
    return Array.from(_cache.entries()).map(([key, entry]) => ({
        key,
        expiresIn: Math.round((entry.expiresAt - now) / 1000) + 's',
    }));
}

// ─── API Functions (Tetap Sama Seperti Sebelumnya) ──────────────────

async function getForYou() { return _request('/foryou', 'foryou'); }
async function getVip() { return _request('/vip', 'vip'); }
async function getDubindo(classify = 'terbaru') { return _request(`/dubindo?classify=${encodeURIComponent(classify)}`, `dubindo:${classify}`); }

async function getRandomDrama() {
    const res = await fetch(`${BASE_URL}/randomdrama`, { headers: { accept: '*/*' } });
    if (!res.ok) throw new Error(`DramaBox API error ${res.status}: /randomdrama`);
    return res.json();
}

async function getLatest() { return _request('/latest', 'latest'); }
async function getTrending() { return _request('/trending', 'trending'); }
async function getPopulerSearch() { return _request('/populersearch', 'populersearch'); }

async function searchDrama(query) {
    if (!query || !query.trim()) throw new Error('query wajib diisi');
    return _request(`/search?query=${encodeURIComponent(query.trim())}`, `search:${query.trim().toLowerCase()}`);
}

async function getDetail(bookId) {
    if (!bookId) throw new Error('bookId wajib diisi');
    return _request(`/detail?bookId=${bookId}`, `detail:${bookId}`);
}

async function getAllEpisodes(bookId) {
    if (!bookId) throw new Error('bookId wajib diisi');
    return _request(`/allepisode?bookId=${bookId}`, `allepisode:${bookId}`);
}

async function decryptVideo(videoUrl) {
    if (!videoUrl) throw new Error('videoUrl wajib diisi');
    return _request(`/decrypt?url=${encodeURIComponent(videoUrl)}`, `decrypt:${videoUrl}`);
}

// ─── Helper Functions ──────────────────────────────────────────────

function pickVideoUrl(cdnList, quality = 720, preferDefault = true) {
    if (!Array.isArray(cdnList) || cdnList.length === 0) return null;
    const cdn = preferDefault ? (cdnList.find((c) => c.isDefault === 1) || cdnList[0]) : cdnList[0];
    const match = cdn.videoPathList.find((v) => v.quality === quality);
    if (match) return match.videoPath;
    const fallback = cdn.videoPathList.find((v) => v.isDefault === 1);
    return fallback ? fallback.videoPath : cdn.videoPathList[0]?.videoPath || null;
}

async function getStreamUrl(episode, quality = 720) {
    const videoUrl = pickVideoUrl(episode.cdnList, quality);
    if (!videoUrl) throw new Error('Tidak ada videoUrl ditemukan di cdnList');
    const result = await decryptVideo(videoUrl);
    if (!result.success) throw new Error('Decrypt gagal: ' + result.message);
    return result.streamUrl;
}

module.exports = {
    getForYou, getVip, getDubindo, getRandomDrama, getLatest, getTrending, getPopulerSearch,
    searchDrama, getDetail, getAllEpisodes, decryptVideo, pickVideoUrl, getStreamUrl,
    clearCache, cacheInfo,
};
