import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const ADAPT_SCRIPT_PROMPT = `
Tu es un assistant expert en production de voix off, spécialisé dans le ton "papa conteur".
Ton rôle est de réécrire le script fourni pour qu'il soit chaleureux, captivant et posé.
Tu dois absolument insérer des indications scéniques entre crochets pour guider la lecture.

Indications de narration (lecture seule) : [pause], [voix plus basse], [accélère], [chuchote], [sourire dans la voix], [ton grave], [émerveillement], [voix douce et rassurante], [pause, rapproche-toi], [chuchote comme un secret], [voix grave de papa ours], [rire léger].
Indications Sonores (déclenchent un bruitage) : [FORET], [MAGIE], [VENT], [OISEAUX], [NUIT], [EAU].

Ton demandé : {tone}

Règles :
- Utilise des expressions chaleureuses comme "mon grand", "tu vois", "écoute bien".
- Ajoute de petites digressions affectueuses si approprié.
- Insère les Indications Sonores (bruitages) aux moments clés de l'ambiance.
- Insère les Indications de narration très régulièrement pour donner du rythme.
- Conserve le sens original du script.

Script brut :
{script}
`;

export async function adaptScript(script: string, tone: string, characterNotes?: string) {
  const model = "gemini-3-flash-preview";
  const prompt = ADAPT_SCRIPT_PROMPT
    .replace("{script}", script)
    .replace("{tone}", tone) + (characterNotes ? `\n\nNotes personnages :\n${characterNotes}` : "");

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
