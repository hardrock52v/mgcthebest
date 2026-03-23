import express from "express";
import { createServer as createViteServer } from "vite";
import ytSearch from "yt-search";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Search endpoint using yt-search
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json({ results: [] });
      }
      
      const r = await ytSearch(query);
      // Only return top 15 results to keep it lightweight
      const videos = r.videos.slice(0, 15).map(v => ({
        id: v.videoId,
        title: v.title,
        author: v.author.name,
        thumbnail: v.thumbnail,
        duration: v.timestamp
      }));
      
      res.json({ results: videos });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Arama başarısız oldu" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
