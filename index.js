const express = require('express');
const cors = require('cors');
const dramabox = require('./dramabox'); 

const app = express();
app.use(cors());

// Vercel akan otomatis menyajikan folder /public, jadi express.static tidak perlu lagi di sini

app.get('/api/feed', async (req, res) => {
    try {
        const forYouList = await dramabox.getForYou();
        const topDramas = forYouList.slice(0, 5);
        const feedData = [];

        for (const drama of topDramas) {
            try {
                const episodes = await dramabox.getAllEpisodes(drama.bookId);
                
                if (episodes && episodes.length > 0) {
                    const firstEpisode = episodes[0];
                    const streamUrl = await dramabox.getStreamUrl(firstEpisode, 720);

                    feedData.push({
                        id: drama.bookId,
                        title: drama.bookName || 'Drama Box',
                        desc: firstEpisode.chapterName || drama.description || 'Episode 1',
                        videoUrl: streamUrl,
                        coverUrl: drama.coverUrl
                    });
                }
            } catch (err) {
                console.error(`Gagal memproses video ID ${drama.bookId}:`, err.message);
            }
        }

        res.json({ success: true, data: feedData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memuat feed video' });
    }
});

// PENTING UNTUK VERCEL: Export app (jangan gunakan app.listen secara langsung)
module.exports = app;

// Agar tetap bisa di-test di lokal menggunakan "node index.js"
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Local server berjalan di http://localhost:${PORT}`);
    });
}
