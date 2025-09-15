import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import NodeID3 from "node-id3";
import ffmpeg from "fluent-ffmpeg";

// Windows: FFmpeg exe path ni qo‘shish
ffmpeg.setFfmpegPath("C:\\Users\\farru\\Downloads\\ffmpeg-8.0-essentials_build\\ffmpeg-8.0-essentials_build\\bin\\ffmpeg.exe");

const app = express();
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Upload papkasini tekshir va yarat
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer sozlamalari: audio va cover
const upload = multer({ dest: uploadDir });

// POST /api/edit
app.post("/api/edit", upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "cover", maxCount: 1 },
]), async (req, res) => {
  try {
    console.log("📂 Request files:", req.files);
    console.log("📦 Request body:", req.body);

    const audioFile = req.files["audio"]?.[0];
    const coverFile = req.files["cover"]?.[0];

    if (!audioFile) return res.status(400).send("Audio fayl kelmadi!");

    const { title, artist } = req.body;
    const inputPath = path.resolve(audioFile.path);
    const outputPath = path.resolve(uploadDir, `edited-${Date.now()}.mp3`);

    // FFMPEG bilan remux (Windows friendly)
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec("libmp3lame")
        .format("mp3")
        .save(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    // ID3 tag qo‘shish
    const tags = {
      title: title || "Untitled",
      artist: artist || "Unknown Artist",
    };

    if (coverFile) {
      tags.APIC = coverFile.path; // Cover rasmni qo‘shish
    }

    const success = NodeID3.update(tags, outputPath);
    console.log("🟢 Tag yozildi:", success);

    // Faylni clientga jo‘natish
    res.download(outputPath, "edited.mp3", () => {
      fs.unlinkSync(inputPath);
      if (coverFile) fs.unlinkSync(coverFile.path);
      fs.unlinkSync(outputPath);
    });

  } catch (err) {
    console.error("🔥 Backend xatolik:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.listen(PORT, () => console.log(`✅ Backend http://localhost:${PORT} da ishlamoqda`));
