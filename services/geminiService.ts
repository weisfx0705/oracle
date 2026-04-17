
import { GoogleGenAI, Modality } from "@google/genai";
import { Poem } from "../types";

const API_KEY = process.env.API_KEY || "";

export const getGeminiInterpretation = async (apiKey: string, question: string, poem: Poem): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const poemText = poem.content.join("，");
  const prompt = `
    用戶的問題是：「${question}」
    抽到的觀音靈籤是第 ${poem.id} 籤：
    籤詩內容：${poemText}
    
    請你作為一位精通命理但「非常現代化」且「幽默風趣」的大師進行解籤。
    
    要求細節：
    1. 說話方式要像現代人，可以毒舌、可以吐槽、可以幽默，但核心要一針見血。
    2. 適度使用豐富的表情符號 (emoji) 增加親切感。
    3. 針對用戶的問題，直接給出最真實（甚至有點扎心）的建議，不要老生常談。
    4. 內容請包含：【大師吐槽】、【籤詩現代白話翻譯】、【給你的神建議】。
    5. 使用繁體中文，並用簡單的 Markdown 格式回傳（使用 ## 標題與粗體）。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.9,
        topP: 0.95,
      }
    });
    return response.text || "大師去買咖啡了，等會再說。☕️";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "訊號不太好，大概是靈界基地台維修中。🛰️";
  }
};

export const generatePoemImage = async (apiKey: string, poem: Poem, customStyle: string = "3D paper cutting art style with exquisite layers"): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const poemText = poem.content.join(" ");
  // 強化提示詞，嚴禁出現任何形式的文字、字母或數字
  const prompt = `A mystical dark-themed oracle card, ${customStyle}, the art depicts the essence of: "${poemText}". Dark ambient atmosphere, backlit with sacred golden and deep blue light, paper textures or artistic strokes, holy but moody vibes. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO CHARACTERS, NO WORDS, ONLY PURE ARTWORK.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return "";
  } catch (error) {
    console.error("Image Generation Error:", error);
    return "";
  }
};

// --- TTS Helpers ---
// --- TTS Helpers ---
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function createWavBlob(samples: Uint8Array, sampleRate: number, numChannels: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + samples.length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * blockAlign)
  view.setUint32(28, sampleRate * numChannels * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length, true);

  // write the PCM samples
  const rawBytes = new Uint8Array(buffer);
  rawBytes.set(samples, 44);

  return new Blob([buffer], { type: 'audio/wav' });
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateInterpretationAudio = async (
  apiKey: string,
  interpretation: string,
  existingContext?: AudioContext
): Promise<{ buffer: AudioBuffer, blob: Blob } | null> => {
  const ai = new GoogleGenAI({ apiKey });

  // 1. 先生成 150 字的幽默總結文本
  const summaryResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `請將以下解籤內容總結成一段約 150 字的口語稿。
    要求：台灣年輕男性的口吻，語氣非常現代、幽默、風趣且帶點「派」的感覺，說話要有力、速度快、情緒起伏大。
    內容要繁體中文，且適合朗讀。
    解籤內容：${interpretation}`,
  });

  const summaryText = summaryResponse.text || "喂！聽好了，大師叫你放輕鬆點。";

  // 2. 將文本轉為語音
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `唸出這段文字，要求台灣口音、年輕活力的聲音、情緒飽滿且語速輕快：${summaryText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // Puck 是比較年輕活潑的男聲
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const rawData = decodeBase64(base64Audio);
      // Use existing context if provided, otherwise create a temporary one for decoding
      const audioCtx = existingContext || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const audioBuffer = await decodeAudioData(
        rawData,
        audioCtx,
        24000,
        1,
      );

      const audioBlob = createWavBlob(rawData, 24000, 1);

      return { buffer: audioBuffer, blob: audioBlob };
    }
  } catch (error) {
    console.error("TTS Error:", error);
  }
  return null;
};
