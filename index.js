const express = require('express');
const cors = require('cors');
const dramabox = require('./dramabox'); 

const app = express();
app.use(cors());
app.use(express.json()); // Untuk parsing JSON body

// 1. Endpoint Feed (TikTok Style - For You)
app.get('/api/feed', async (req, res) => {
    try {
        const forYouList = await dramabox.getForYou();
        const topDramas = forYouList.slice(0, 7); // Ambil 7 untuk feed
        const feedData = [];

        for (const drama of topDramas) {
            try {
                const episodes = await dramabox.getAllEpisodes(drama.bookId);
                if (episodes && episodes.length > 0) {
                    const firstEpisode = episodes[0];
                    const streamUrl = await dramabox.getStreamUrl(firstEpisode, 720);
                    feedData.push({
                        id: drama.bookId,
                        title: drama.bookName,
                        desc: firstEpisode.chapterName || drama.description,
                        videoUrl: streamUrl,
                        coverUrl: drama.coverUrl
                    });
                }
            } catch (err) { console.error(`Skip ID ${drama.bookId}`); }
        }
        res.json({ success: true, data: feedData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memuat feed' });
    }
});

// 2. Endpoint Explore (Trending, Latest, & Dubbing Indonesia)
app.get('/api/explore', async (req, res) => {
    try {
        // Fetch paralel agar lebih cepat
        const [trending, latest, dubindo] = await Promise.all([
            dramabox.getTrending(),
            dramabox.getLatest(),
            dramabox.getDubindo('terbaru') // Mengambil khusus Dubbing ID
        ]);
        res.json({ success: true, data: { trending, latest, dubindo } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Endpoint Search
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json({ success: true, data: [] });
        const results = await dramabox.searchDrama(query);
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Endpoint Play (Ambil URL Stream langsung berdasarkan bookId)
app.get('/api/play/:bookId', async (req, res) => {
    try {
        const episodes = await dramabox.getAllEpisodes(req.params.bookId);
        if (!episodes || episodes.length === 0) throw new Error("Episode tidak ditemukan");
        
        // Default play episode 1
        const streamUrl = await dramabox.getStreamUrl(episodes[0], 720);
        res.json({ success: true, streamUrl });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
}
