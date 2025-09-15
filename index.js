import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import NodeID3 from "node-id3";
import ffmpeg from "fluent-ffmpeg";

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ FFMPEG path — Windows uchun lokal sozlash
if (process.platform === "win32") {
  ffmpeg.setFfmpegPath("C:\\Users\\farru\\Downloads\\ffmpeg-8.0-essentials_build\\ffmpeg.exe");
}

// -------------------- CORS --------------------
app.use(cors({
  origin: [
    "https://farrukh-mp3-editor.vercel.app",
    "http://localhost:3000",
    /\.t\.me$/, // Telegram Mini App
  ],
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json());

// -------------------- Upload sozlash --------------------
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
});

// -------------------- API Route --------------------
app.post("/api/edit", upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "cover", maxCount: 1 },
]), async (req, res) => {
  try {
    const audioFile = req.files["audio"]?.[0];
    const coverFile = req.files["cover"]?.[0];

    if (!audioFile) return res.status(400).send("Audio fayl kelmadi!");

    const { title, artist } = req.body;
    const inputPath = path.resolve(audioFile.path);
    const outputPath = path.resolve(uploadDir, `edited-${Date.now()}.mp3`);

    // MP3 faylni qayta ishlash
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec("libmp3lame")
        .format("mp3")
        .save(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    // ID3 tag qo'shish
    const tags = {
      title: title || "Untitled",
      artist: artist || "Unknown Artist",
    };
    if (coverFile) tags.APIC = coverFile.path;

    NodeID3.update(tags, outputPath);

    // Telegram Mini App uchun stream orqali yuborish
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "attachment; filename=edited.mp3");

    fs.createReadStream(outputPath).pipe(res).on("finish", () => {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (coverFile && fs.existsSync(coverFile.path)) fs.unlinkSync(coverFile.path);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (cleanupError) {
        console.error("🧹 Fayl tozalashda xatolik:", cleanupError);
      }
    });

  } catch (err) {
    console.error("🔥 Backend xatolik:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// -------------------- Server --------------------
app.listen(PORT, () => console.log(`✅ Backend http://localhost:${PORT} da ishlamoqda`));
