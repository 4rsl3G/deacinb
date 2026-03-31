const express = require('express');
const cors = require('cors');
const path = require('path');
const dramabox = require('./dramabox'); // Pastikan file dramabox.js ada di folder yang sama

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Mengatur folder 'public' sebagai tempat file statis (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Endpoint API untuk mengambil Feed Video (Gaya TikTok)
 * Endpoint ini akan menggabungkan data 'For You', mengambil episode 1, 
 * dan langsung memberikan 'streamUrl' yang siap putar.
 */
app.get('/api/feed', async (req, res) => {
    try {
        // 1. Ambil daftar drama dari halaman "For You"
        const forYouList = await dramabox.getForYou();
        
        // 2. Ambil 5 drama teratas agar response API tidak terlalu lambat
        const topDramas = forYouList.slice(0, 5);
        const feedData = [];

        for (const drama of topDramas) {
            try {
                // 3. Ambil daftar episode untuk setiap drama
                const episodes = await dramabox.getAllEpisodes(drama.bookId);
                
                if (episodes && episodes.length > 0) {
                    const firstEpisode = episodes[0]; // Ambil episode 1
                    
                    // 4. Decrypt URL video agar bisa diputar langsung di tag <video>
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
                console.error(`Gagal memproses video untuk drama ID ${drama.bookId}:`, err.message);
                // Lanjut ke drama berikutnya jika ada error dekripsi
            }
        }

        res.json({ success: true, data: feedData });
    } catch (error) {
        console.error('API Feed Error:', error);
        res.status(500).json({ success: false, message: 'Gagal memuat feed video' });
    }
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
