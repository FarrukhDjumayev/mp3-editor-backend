// import express from "express";
// import multer from "multer";
// import cors from "cors";
// import fs from "fs";
// import path from "path";
// import NodeID3 from "node-id3";
// import ffmpeg from "fluent-ffmpeg";

// const app = express();
// const PORT = process.env.PORT || 5000;

// // ✅ FFMPEG path — Windows uchun lokal sozlash
// if (process.platform === "win32") {
//   ffmpeg.setFfmpegPath("C:\\Users\\farru\\Downloads\\ffmpeg-8.0-essentials_build\\ffmpeg.exe");
// }

// // -------------------- CORS --------------------
// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // Agar origin yo'q bo'lsa (Postman yoki curl orqali test) ruxsat beramiz
//       if (!origin) return callback(null, true);

//       const allowedOrigins = [
//         "https://farrukh-mp3-editor.vercel.app",
//         "http://localhost:3000",
//       ];

//       // Telegram Mini App domeni uchun regex tekshiruv
//       const telegramRegex = /\.t\.me$/;

//       if (allowedOrigins.includes(origin) || telegramRegex.test(origin)) {
//         callback(null, true); // Ruxsat beramiz
//       } else {
//         callback(new Error("CORS bloklandi: ruxsat berilmagan domen!"));
//       }
//     },
//     methods: ["GET", "POST"],
//     credentials: true,
//   })
// );

// app.use(express.json());

// // -------------------- Upload sozlash --------------------
// const uploadDir = path.join(process.cwd(), "uploads");
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// const upload = multer({
//   dest: uploadDir,
//   limits: {
//     fileSize: 20 * 1024 * 1024, // 20 MB
//   },
// });

// // -------------------- API Route --------------------
// app.post("/api/edit", upload.fields([
//   { name: "audio", maxCount: 1 },
//   { name: "cover", maxCount: 1 },
// ]), async (req, res) => {
//   try {
//     const audioFile = req.files["audio"]?.[0];
//     const coverFile = req.files["cover"]?.[0];

//     if (!audioFile) return res.status(400).send("Audio fayl kelmadi!");

//     const { title, artist } = req.body;
//     const inputPath = path.resolve(audioFile.path);
//     const outputPath = path.resolve(uploadDir, `edited-${Date.now()}.mp3`);

//     // MP3 faylni qayta ishlash
//     await new Promise((resolve, reject) => {
//       ffmpeg(inputPath)
//         .audioCodec("libmp3lame")
//         .format("mp3")
//         .save(outputPath)
//         .on("end", () => resolve())
//         .on("error", (err) => reject(err));
//     });

//     // ID3 tag qo'shish
//     const tags = {
//       title: title || "Untitled",
//       artist: artist || "Unknown Artist",
//     };
//     if (coverFile) tags.APIC = coverFile.path;

//     NodeID3.update(tags, outputPath);

//     // Telegram Mini App uchun stream orqali yuborish
//     res.setHeader("Content-Type", "audio/mpeg");
//     res.setHeader("Content-Disposition", "attachment; filename=edited.mp3");

//     fs.createReadStream(outputPath).pipe(res).on("finish", () => {
//       try {
//         if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
//         if (coverFile && fs.existsSync(coverFile.path)) fs.unlinkSync(coverFile.path);
//         if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
//       } catch (cleanupError) {
//         console.error("🧹 Fayl tozalashda xatolik:", cleanupError);
//       }
//     });

//   } catch (err) {
//     console.error("🔥 Backend xatolik:", err);
//     res.status(500).json({ error: err.message || String(err) });
//   }
// });

// // -------------------- Server --------------------
// app.listen(PORT, () => console.log(`✅ Backend http://localhost:${PORT} da ishlamoqda`));

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
app.use(cors({
  origin: [
<<<<<<< HEAD
    "https://farrukh-mp3-editor.vercel.app", // Sizning frontend Vercel URL
    "http://localhost:3000",                 // Localhost uchun
    /\.t\.me$/,                              // Telegram Mini App uchun
=======
    "https://your-mini-app.vercel.app",
    "http://localhost:3000",
>>>>>>> a0dbcdf62e095a1504b8f7a5542a96cdd71f3615
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
<<<<<<< HEAD
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
=======
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
>>>>>>> a0dbcdf62e095a1504b8f7a5542a96cdd71f3615
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

    if (!audioFile) return res.status(400).send("Audio fayl kelmadi!");
    if (!telegram_id) return res.status(400).send("Telegram ID yo‘q!");

    const inputPath = path.resolve(audioFile.path);
    const outputPath = path.resolve(uploadDir, `edited-${Date.now()}.mp3`);

    // MP3 faylni qayta ishlash
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec("libmp3lame")
        .format("mp3")
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);
    });

    // ID3 tag qo'shish
    const tags = { title: title || "Untitled", artist: artist || "Unknown Artist" };
    if (coverFile) tags.APIC = coverFile.path;
    NodeID3.update(tags, outputPath);

    // ---------------- Telegram foydalanuvchiga yuborish ----------------
    await bot.telegram.sendAudio(
<<<<<<< HEAD
      telegram_id,
=======
      telegram_id, // Faqat shu foydalanuvchiga yuboriladi
>>>>>>> a0dbcdf62e095a1504b8f7a5542a96cdd71f3615
      { source: fs.createReadStream(outputPath) },
      {
        title: tags.title,
        performer: tags.artist,
      }
    );

    res.status(200).json({ message: "Audio tayyor va foydalanuvchiga yuborildi!" });

    // Fayllarni tozalash
    setTimeout(() => {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (coverFile && fs.existsSync(coverFile.path)) fs.unlinkSync(coverFile.path);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (err) {
        console.error("🧹 Tozalashda xato:", err);
      }
    }, 5000);

  } catch (err) {
    console.error("🔥 Backend xatolik:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- Bot ishga tushishi --------------------
bot.launch();
app.listen(PORT, () => {
  console.log(`✅ Backend http://localhost:${PORT} da ishlamoqda`);
});
