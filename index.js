import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import NodeID3 from "node-id3";
import ffmpeg from "fluent-ffmpeg";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const bot = new Telegraf(process.env.BOT_TOKEN);

// -------------------- CORS --------------------
const allowedOrigins = [
  "https://farrukh-mp3-editor.vercel.app",
  "http://localhost:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /\.t\.me$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS bloklandi"));
  },
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json());

// -------------------- Upload sozlash --------------------
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// -------------------- MP3 edit route --------------------
app.post("/api/edit", upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "cover", maxCount: 1 },
]), async (req, res) => {
  try {
    const audioFile = req.files["audio"]?.[0];
    const coverFile = req.files["cover"]?.[0];
    const { title, artist, telegram_id } = req.body;

    if (!audioFile) {
      return res.status(400).json({ success: false, error: "Audio fayl kelmadi!" });
    }

    const inputPath = path.resolve(audioFile.path);
    const outputPath = path.resolve(uploadDir, `edited-${Date.now()}.mp3`);

    // Fayl MP3 bo'lsa konvertatsiya qilmaslik
    const isMP3 = path.extname(audioFile.originalname).toLowerCase() === ".mp3";

    if (isMP3) {
      fs.copyFileSync(inputPath, outputPath);
    } else {
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .audioCodec("libmp3lame")
          .format("mp3")
          .save(outputPath)
          .on("end", resolve)
          .on("error", reject);
      });
    }

    // ID3 tag qo'shish
    const tags = {
      title: title || "Untitled",
      artist: artist || "Unknown Artist",
    };

    if (coverFile) {
      tags.APIC = {
        type: 3,
        data: fs.readFileSync(coverFile.path),
        description: "Cover image",
      };
    }

    NodeID3.update(tags, outputPath);

    // ---------- Telegram Mini App foydalanuvchisi ----------
    if (telegram_id) {
      await bot.telegram.sendAudio(
        telegram_id,
        { source: fs.createReadStream(outputPath) },
        {
          title: tags.title,
          performer: tags.artist,
        }
      );

      res.status(200).json({ success: true, message: "Audio tayyor va foydalanuvchiga yuborildi!" });
    } 
    // ---------- Oddiy sayt foydalanuvchisi ----------
    else {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", `attachment; filename="${tags.title}.mp3"`);

      const fileStream = fs.createReadStream(outputPath);
      fileStream.pipe(res);

      fileStream.on("close", () => {
        // Fayllarni tozalash
        setTimeout(() => {
          try {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (coverFile && fs.existsSync(coverFile.path)) fs.unlinkSync(coverFile.path);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
          } catch (err) {
            console.error("🧹 Tozalashda xato:", err);
          }
        }, 10000);
      });
      return;
    }

    // Fayllarni tozalash
    setTimeout(() => {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (coverFile && fs.existsSync(coverFile.path)) fs.unlinkSync(coverFile.path);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (err) {
        console.error("🧹 Tozalashda xato:", err);
      }
    }, 10000);

  } catch (err) {
    console.error("🔥 Backend xatolik:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------- Bot ishga tushishi --------------------
if (process.env.NODE_ENV === "production") {
  // Render/Webhook rejimi
  const webhookPath = "/webhook";
  const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}${webhookPath}`;
  app.use(bot.webhookCallback(webhookPath));
  bot.telegram.setWebhook(webhookUrl);
  console.log("🤖 Bot webhook rejimida ishlamoqda:", webhookUrl);
} else {
  // Lokal test uchun polling
  bot.launch();
  console.log("🤖 Bot polling rejimida ishlamoqda (lokal)");
}

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

app.listen(PORT, () => {
  console.log(`✅ Backend http://localhost:${PORT} da ishlamoqda`);
});
