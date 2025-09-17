// import express from "express";
// import multer from "multer";
// import cors from "cors";
// import fs from "fs";
// import path from "path";
// import NodeID3 from "node-id3";
// import ffmpeg from "fluent-ffmpeg";
// import dotenv from "dotenv";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5000;

// // -------------------- FFMPEG sozlash --------------------
// if (process.platform === "win32") {
//   ffmpeg.setFfmpegPath(
//     "C:\\Users\\farru\\Downloads\\ffmpeg-8.0-essentials_build\\ffmpeg.exe"
//   );
// }

// // -------------------- CORS sozlash --------------------
// // Dinamik origin tekshirish
// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (
//         !origin || // Postman va local test uchun
//         origin.includes("localhost:3000") ||
//         origin.includes("farrukh-mp3-editor.vercel.app") ||
//         /\.t\.me$/.test(origin) || // Telegram WebApp uchun
//         origin.includes("web.telegram.org")
//       ) {
//         callback(null, true);
//       } else {
//         callback(new Error("CORS bloklandi: " + origin));
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

// // Faylni to‘g‘ri nomlash (mobil uchun ham)
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname) || ".mp3";
//     cb(null, `${file.fieldname}-${Date.now()}${ext}`);
//   },
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
// });

// // -------------------- Fayllarni tozalash helper --------------------
// function cleanupFiles(files = []) {
//   files.forEach((filePath) => {
//     if (filePath && fs.existsSync(filePath)) {
//       try {
//         fs.unlinkSync(filePath);
//       } catch (err) {
//         console.error("🧹 Faylni o‘chirishda xato:", err);
//       }
//     }
//   });
// }

// // -------------------- API Route --------------------
// app.post(
//   "/api/edit",
//   upload.fields([
//     { name: "audio", maxCount: 1 },
//     { name: "cover", maxCount: 1 },
//   ]),
//   async (req, res) => {
//     try {
//       const audioFile = req.files["audio"]?.[0];
//       const coverFile = req.files["cover"]?.[0];

//       if (!audioFile)
//         return res.status(400).json({ error: "Audio fayl kelmadi!" });

//       const { title, artist } = req.body;
//       const inputPath = path.resolve(audioFile.path);
//       const outputPath = path.resolve(uploadDir, `edited-${Date.now()}.mp3`);

//       // 🎵 MP3 faylni ffmpeg orqali qayta ishlash
//       await new Promise((resolve, reject) => {
//         ffmpeg(inputPath)
//           .audioCodec("libmp3lame")
//           .format("mp3")
//           .save(outputPath)
//           .on("end", () => resolve())
//           .on("error", (err) => reject(err));
//       });

//       // 🏷️ ID3 Tag qo'shish
//       const tags = {
//         title: title?.trim() || "Untitled",
//         artist: artist?.trim() || "Unknown Artist",
//       };
//       if (coverFile) tags.APIC = coverFile.path;

//       NodeID3.update(tags, outputPath);

//       // 📤 Natijaviy MP3 faylni jo'natish
//       res.setHeader("Content-Type", "audio/mpeg");
//       res.setHeader(
//         "Content-Disposition",
//         `attachment; filename="${(title || "edited").replace(/"/g, "")}.mp3"`
//       );

//       const readStream = fs.createReadStream(outputPath);

//       readStream.pipe(res).on("close", () => {
//         // Fayllarni tozalash
//         cleanupFiles([inputPath, coverFile?.path, outputPath]);
//       });
//     } catch (err) {
//       console.error("🔥 Backend xatolik:", err);
//       res.status(500).json({ error: err.message || String(err) });
//     }
//   }
// );

// // -------------------- Health check --------------------
// app.get("/", (req, res) => {
//   res.json({ message: "MP3 Editor backend ishlayapti 🚀" });
// });

// // -------------------- Server --------------------
// app.listen(PORT, () =>
//   console.log(`✅ Backend http://localhost:${PORT} da ishlamoqda`)
// );

// server.js
import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import NodeID3 from "node-id3";
import ffmpeg from "fluent-ffmpeg";
import dotenv from "dotenv";
import { pipeline } from "stream/promises"; // Node 16+ tavsiya etiladi

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// -------------------- FFMPEG sozlash --------------------
const ffmpegPath = process.env.FFMPEG_PATH;
if (ffmpegPath && fs.existsSync(ffmpegPath) && process.platform === "win32") {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

// -------------------- CORS sozlash --------------------
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || "https://farrukh-mp3-editor.vercel.app",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // origin === undefined/null => Postman, some webviews; ruxsat beramiz
      if (!origin) return callback(null, true);

      try {
        // oddiy va tez cheklar
        const ok =
          allowedOrigins.some((o) => origin === o || origin.startsWith(o)) ||
          origin.endsWith(".t.me") ||
          origin.includes("web.telegram.org");

        if (ok) return callback(null, true);
      } catch (e) {
        // pass-through to block below
      }

      callback(new Error("CORS bloklandi: " + origin));
    },
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

// -------------------- Upload sozlash --------------------
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeExt =
      path.extname(file.originalname) ||
      (file.mimetype?.includes("audio") ? ".mp3" : "");
    cb(null, `${file.fieldname}-${Date.now()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// -------------------- Fayllarni tozalash helper --------------------
function cleanupFiles(files = []) {
  files.forEach((filePath) => {
    if (!filePath) return;
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      console.error("🧹 Faylni o‘chirishda xato:", err);
    }
  });
}

// -------------------- API Route --------------------
app.post(
  "/api/edit",
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  async (req, res) => {
    const audioFile = req.files?.audio?.[0];
    const coverFile = req.files?.cover?.[0];

    if (!audioFile)
      return res.status(400).json({ error: "Audio fayl kelmadi!" });

    const { title, artist } = req.body;
    const inputPath = path.resolve(audioFile.path);
    const outputPath = path.resolve(uploadDir, `edited-${Date.now()}.mp3`);
    const coverPath = coverFile ? path.resolve(coverFile.path) : null;

    try {
      // ffmpeg bilan MP3 ga konvert yoki qayta kodlash
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .audioCodec("libmp3lame")
          .format("mp3")
          .save(outputPath)
          .on("end", resolve)
          .on("error", reject);
      });

      // ID3 tag tayyorlash
      const tags = {
        title: (title || "Untitled").toString().trim(),
        artist: (artist || "Unknown Artist").toString().trim(),
      };

      // Muqova (cover) — NodeID3 uchun buffer sifatida berish
      if (coverPath && fs.existsSync(coverPath)) {
        const buf = fs.readFileSync(coverPath);
        tags.image = {
          mime: coverFile.mimetype || "image/jpeg",
          type: { id: 3, name: "front cover" },
          description: "cover",
          imageBuffer: buf,
        };
        // ba'zi versiyalarda APICga buffer ham ishlaydi — qo'shimcha qo'yamiz
        tags.APIC = buf;
      }

      // ID3 yozish (synchron yoki callback bilan tekshirish mumkin)
      const ok = NodeID3.update(tags, outputPath);
      if (!ok) console.warn("ID3 update returned falsy — tekshiring");

      // Javobni stream qilib yuborish
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${(title || "edited").replace(/"/g, "")}.mp3"`
      );

      const readStream = fs.createReadStream(outputPath);

      // pipeline - agar client kesilsa yoki boshqa xato bo'lsa, catchga tushadi
      await pipeline(readStream, res);

      // pipeline tugagach fayllarni o'chirish
      cleanupFiles([inputPath, coverPath, outputPath]);
    } catch (err) {
      console.error("🔥 Backend xatolik:", err);
      // xatolik holatida ham temp fayllarni tozalash
      cleanupFiles([inputPath, coverPath, outputPath]);
      // mijozga xabar
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || "Server xatosi" });
      } else {
        // agar response allaqachon yuborilayotgan bo'lsa, faqat log
      }
    }
  }
);

// -------------------- Health check --------------------
app.get("/", (req, res) =>
  res.json({ message: "MP3 Editor backend ishlayapti 🚀" })
);

// -------------------- Server --------------------
app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Backend http://localhost:${PORT} da ishlamoqda`)
);
