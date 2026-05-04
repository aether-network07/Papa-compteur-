import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fetch from "node-fetch";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

// Initialisation du client TTS (sera utilisé si les credentials sont présents)
let ttsClient: TextToSpeechClient | null = null;
try {
  // On essaye d'instancier le client. S'il n'y a pas de credentials valides dans l'env, 
  // cela pourra échouer plus tard lors de l'appel s'ils ne sont pas configurés.
  ttsClient = new TextToSpeechClient();
} catch (e) {
  console.error("Erreur init TTS Client:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Route proxy pour le TTS (Text-to-Speech)
  app.get("/api/tts", async (req, res) => {
    const text = req.query.text as string;
    if (!text) return res.status(400).send("Texte manquant");

    try {
      if (ttsClient) {
        // FORCE la voix masculine fr-FR-Wavenet-D comme demandé OBLIGATOIREMENT
        try {
          const [response] = await ttsClient.synthesizeSpeech({
            input: { text },
            voice: { languageCode: 'fr-FR', name: 'fr-FR-Wavenet-D' },
            audioConfig: { audioEncoding: 'MP3' },
          });

          if (response.audioContent) {
            res.setHeader('Content-Type', 'audio/mpeg');
            // On renvoie directement le contenu binaire
            return res.send(response.audioContent);
          }
        } catch (ttsErr) {
          console.error("Détail erreur Google TTS:", ttsErr);
          // Si l'API renvoie une erreur (ex: quota ou auth), on laisse le fallback s'activer
        }
      }

      // FALLBACK : On utilise l'API gratuite avec fr-ca (homme par défaut)
      const segments: string[] = [];
      const maxLength = 180;
      let currentIdx = 0;
      while (currentIdx < text.length) {
        let chunk = text.substring(currentIdx, currentIdx + maxLength);
        if (currentIdx + maxLength < text.length) {
          const lastSpace = chunk.lastIndexOf(' ');
          if (lastSpace > 50) chunk = chunk.substring(0, lastSpace);
        }
        segments.push(chunk.trim());
        currentIdx += chunk.length;
      }

      const audioChunks: Buffer[] = [];
      const tl = 'fr-ca'; 
      for (const segment of segments) {
        if (!segment) continue;
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(segment)}&tl=${tl}&client=tw-ob`;
        const response = await fetch(ttsUrl, {
          headers: { 'Referer': 'http://translate.google.com/', 'User-Agent': 'Mozilla/5.0' }
        });
        if (response.ok) audioChunks.push(Buffer.from(await response.arrayBuffer()));
      }

      if (audioChunks.length === 0) throw new Error("Aucun audio généré");
      const finalAudio = Buffer.concat(audioChunks);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(finalAudio);

    } catch (error) {
      console.error("Erreur serveur TTS:", error);
      res.status(500).send("Erreur de génération audio");
    }
  });

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
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });
}

startServer();
