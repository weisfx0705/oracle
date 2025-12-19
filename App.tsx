
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppStep, Poem, RandomSeed } from './types';
import { POEMS, SVGS } from './constants';
import { getGeminiInterpretation, generatePoemImage, generateInterpretationAudio } from './services/geminiService';
import { SettingsModal } from './components/SettingsModal';

// 隨機範例清單
const QUESTION_PLACEHOLDERS = [
  "那個一直不回我訊息的人，到底在想什麼？😤",
  "老闆最近一直看我，是不是想幫我加薪（還是叫我捲鋪蓋）？💼",
  "我這輩子還有機會中大樂透，從此過上退休生活嗎？🎰",
  "今年年底前，我能不能順利脫單？還是繼續當光棍？❤️",
  "現在這個投資標的，到底是財神敲門還是大坑？💰",
  "為什麼我長得這麼好看，卻還是這麼窮？大師救我！😭",
  "我要換工作嗎？現在這間公司簡直是精神病院...🏥",
  "那個前任突然按我讚，是想復合還是手滑？🤔"
];

const LOADING_MESSAGES = [
  "大師正在翻白眼...啊不是，正在幫你看透紅塵...",
  "大師正在通靈中，目前靈界訊號微弱，請誠心等待...📡",
  "正在翻閱你的生死簿...等一下，這頁怎麼黏住了？📖",
  "正在跟觀音姊姊視訊連線中，目前忙線請稍候...📞",
  "大師正在深呼吸，因為你的問題實在是有點棘手...😤",
  "正在演算你的業障值...數據量龐大，伺服器發熱中...💻",
  "大師正在幫你掐指一算，差點把手指掐斷了...🤏",
  "正在掃描你的桃花運...搜尋中...搜尋中...查無結果（喂！）🌸"
];

// 簡單的 Markdown 渲染組件 (手動轉換基本的 ## 和 ** )
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="interpretation-content text-slate-300">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i}>{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={i}>{line.replace('# ', '')}</h1>;
        }
        // 處理粗體
        const processedLine = line.split('**').map((part, index) =>
          index % 2 === 1 ? <strong key={index}>{part}</strong> : part
        );
        return <p key={i}>{processedLine}</p>;
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [step, setStep] = useState<AppStep>(AppStep.QUESTION);
  const [question, setQuestion] = useState('');
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [randomSeeds, setRandomSeeds] = useState<RandomSeed[]>([]);
  const [showSeeds, setShowSeeds] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [poemResult, setPoemResult] = useState<Poem | null>(null);
  const [interpretation, setInterpretation] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [poemImage, setPoemImage] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [customStyle, setCustomStyle] = useState<string>('');
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Audio states
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    generateNewSeeds();
    setCurrentPlaceholder(QUESTION_PLACEHOLDERS[Math.floor(Math.random() * QUESTION_PLACEHOLDERS.length)]);
    return () => {
      if (audioSourceRef.current) audioSourceRef.current.stop();
    };
  }, []);

  const generateNewSeeds = useCallback(() => {
    // 產生 1-100 的數字陣列
    const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
    // Fisher-Yates shuffle 洗牌算法
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    // 取前 26 個不重複的數字配對給 A-Z
    const seeds: RandomSeed[] = Array.from({ length: 26 }, (_, i) => ({
      letter: String.fromCharCode(65 + i),
      number: numbers[i]
    }));
    setRandomSeeds(seeds);
  }, []);

  const resetApp = () => {
    setQuestion('');
    setPoemResult(null);
    setInterpretation('');
    setPoemImage('');
    setSelectedLetter(null);
    setCustomStyle('');
    setAudioBuffer(null);
    setAudioBlob(null);
    if (audioSourceRef.current) audioSourceRef.current.stop();
    setIsPlaying(false);
    generateNewSeeds();
    setCurrentPlaceholder(QUESTION_PLACEHOLDERS[Math.floor(Math.random() * QUESTION_PLACEHOLDERS.length)]);
    setStep(AppStep.QUESTION);
  };

  const startVoiceInput = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    if (!('webkitSpeechRecognition' in window)) {
      alert('您的瀏覽器不支援語音輸入功能。');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setQuestion(prev => prev + finalTranscript);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleNextStep = () => {
    if (isRecording) recognitionRef.current?.stop();
    if (!question.trim()) {
      alert('請先輸入或訴說您的問題。');
      return;
    }
    if (!apiKey) {
      alert('請先設定 Google API Key 才能進行解籤。');
      setIsSettingsOpen(true);
      return;
    }
    setStep(AppStep.PICKER);
  };

  const handlePick = async (letter: string) => {
    setSelectedLetter(letter);
    const seed = randomSeeds.find(s => s.letter === letter);
    if (!seed) return;

    const poem = POEMS.find(p => p.id === seed.number) || POEMS[0];
    setPoemResult(poem);
    setStep(AppStep.RESULT);

    setIsAnalyzing(true);
    setCurrentLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    const result = await getGeminiInterpretation(apiKey, question, poem);
    setInterpretation(result);
    setIsAnalyzing(false);

    // 生成解籤後的語音總結並自動播放
    setIsGeneratingAudio(true);

    // Initialize AudioContext early to capture user gesture
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const audioResult = await generateInterpretationAudio(apiKey, result, audioContextRef.current);
    if (audioResult) {
      setAudioBuffer(audioResult.buffer);
      setAudioBlob(audioResult.blob);
      setIsGeneratingAudio(false);
      playMasterVoice(audioResult.buffer);
    } else {
      setIsGeneratingAudio(false);
    }
  };

  const playMasterVoice = (passedBuffer?: AudioBuffer) => {
    const targetBuffer = passedBuffer || audioBuffer;
    if (!targetBuffer) return;

    if (isPlaying && !passedBuffer) {
      audioSourceRef.current?.stop();
      setIsPlaying(false);
      return;
    }

    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
    }

    // Use persistent AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;

    // 移動端瀏覽器可能會暫停 AudioContext，需要手動恢復
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const source = ctx.createBufferSource();
    source.buffer = targetBuffer;


    source.connect(ctx.destination);
    source.onended = () => setIsPlaying(false);
    source.start();
    audioSourceRef.current = source;
    setIsPlaying(true);
  };

  const downloadAudio = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `靈曦籤苑_大師開示_${new Date().getTime()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateImage = async () => {
    if (!poemResult) return;
    setIsGeneratingImage(true);
    const style = customStyle.trim() || "3D paper cutting art style with exquisite layers";
    const img = await generatePoemImage(apiKey, poemResult, style);
    setPoemImage(img);
    setIsGeneratingImage(false);
  };

  const downloadResult = () => {
    const formattedInterpretation = interpretation.split('\n').map(line => {
      if (line.startsWith('## ')) return `<h2 style="color: #fbbf24; border-left: 4px solid #fbbf24; padding-left: 12px; margin-top: 32px; font-size: 1.4rem;">${line.replace('## ', '')}</h2>`;
      if (line.trim() === '') return '<br>';
      const bolded = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fcd34d;">$1</strong>');
      return `<p style="margin-bottom: 16px; line-height: 1.8; color: #cbd5e1;">${bolded}</p>`;
    }).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>靈曦籤苑 - 解籤結果</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap');
        body { 
            font-family: 'Noto Sans TC', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'noto sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; 
            padding: 20px; 
            background: #020617; 
            color: #f1f5f9; 
            margin: 0;
            display: flex;
            justify-content: center;
        }
        .container { 
            max-width: 800px; 
            width: 100%;
            background: #0f172a; 
            border: 1px solid #1e293b;
            border-radius: 40px; 
            padding: 60px 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            margin: 20px auto;
        }
        .header { text-align: center; margin-bottom: 60px; }
        .lotus { color: #f9a8d4; font-size: 2rem; margin-bottom: 16px; opacity: 0.6; }
        h1 { color: #fbbf24; font-size: 2.5rem; margin: 0; letter-spacing: 0.2em; font-weight: 900; }
        .sub-header { color: #94a3b8; font-size: 0.9rem; letter-spacing: 0.3em; margin-top: 8px; text-transform: uppercase; }
        
        .question-box { 
            background: #1e293b; 
            padding: 24px; 
            border-radius: 20px; 
            margin-bottom: 48px; 
            border-left: 6px solid #fbbf24;
            font-style: italic;
            color: #94a3b8;
        }
        
        .poem-section { text-align: center; margin-bottom: 64px; }
        .poem-no { display: inline-block; padding: 4px 16px; background: rgba(251, 191, 36, 0.1); color: #fbbf24; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-bottom: 24px; border: 1px solid rgba(251, 191, 36, 0.2); }
        .poem-line { font-size: 2rem; font-weight: bold; margin: 12px 0; color: #f8fafc; letter-spacing: 0.15em; }
        
        .interpretation-section { 
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid #334155;
            padding: 40px;
            border-radius: 32px;
            margin-bottom: 48px;
        }
        
        .image-section { text-align: center; margin-top: 48px; }
        .poem-img { width: 100%; max-width: 500px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 8px solid #1e293b; }
        .img-caption { margin-top: 16px; font-size: 0.75rem; color: #64748b; letter-spacing: 0.1em; }
        
        .footer { text-align: center; margin-top: 64px; padding-top: 32px; border-top: 1px solid #1e293b; color: #475569; font-size: 0.8rem; }
        a { color: #fbbf24; text-decoration: none; }
        @media (max-width: 640px) {
            .container { padding: 40px 24px; border-radius: 24px; }
            .poem-line { font-size: 1.5rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="lotus">❀</div>
            <h1>靈曦籤苑</h1>
            <div class="sub-header">Mystical Oracle Of Guanyin</div>
        </div>
        
        <div class="question-box">
            <strong>您所問之事：</strong><br>
            「${question}」
        </div>
        
        <div class="poem-section">
            <div class="poem-no">觀音靈籤 第 ${poemResult?.id} 籤</div>
            ${poemResult?.content.map(line => `<div class="poem-line">${line}</div>`).join('')}
        </div>
        
        <div class="interpretation-section">
            ${formattedInterpretation}
        </div>
        
        ${poemImage ? `
        <div class="image-section">
            <img class="poem-img" src="${poemImage}" alt="籤詩意象">
            <div class="img-caption">SACRED ART GENERATED BY AI</div>
        </div>
        ` : ''}
        
        <div class="footer">
            <p>© 靈曦籤苑 · 由 Gemini AI 驅動深層智慧</p>
            <p><a href="https://weisfx0705.github.io/chiawei/">義守大學陳嘉暐老師開發</a></p>
            <p style="font-style: italic; opacity: 0.6; margin-top: 16px;">「一切法從心想生，解籤僅供參考，未來掌握在您手中。」</p>
            <p style="opacity: 0.4; margin-top: 8px; font-size: 0.7rem;">Version: 12/19/2025</p>
        </div>
    </div>
</body>
</html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `靈曦籤苑_解籤結果_${new Date().toLocaleDateString()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('GEMINI_API_KEY', key);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 min-h-screen flex flex-col items-center relative">
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-6 right-6 p-3 text-slate-400 hover:text-amber-400 transition-colors z-40 bg-slate-800/50 rounded-full backdrop-blur-sm"
        title="設置 API Key"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSave={saveApiKey}
      />
      {/* Header */}
      <header className="text-center mb-16">
        <div className="flex justify-center mb-4">
          <SVGS.Lotus />
        </div>
        <h1 className="text-6xl font-black font-serif text-amber-500 mb-2 tracking-widest drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">靈曦籤苑</h1>
        <p className="text-amber-200/60 tracking-[0.4em] font-light uppercase">Mystical Oracle of Guanyin</p>
      </header>

      {/* Main Container */}
      <main className="w-full bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-10 sacred-glow border border-slate-700/50">

        {step === AppStep.QUESTION && (
          <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-amber-400 mb-4">今日有何煩惱？🤔</h2>
              <p className="text-slate-400">請在下方輸入或訴說您的問題，大師為您指點迷津。</p>
            </div>

            <div className="relative group">
              <textarea
                className="w-full h-48 p-8 rounded-3xl bg-slate-900/50 border border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 outline-none text-xl transition-all text-amber-50 placeholder:text-slate-600 shadow-inner"
                placeholder={currentPlaceholder}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button
                onClick={startVoiceInput}
                className={`absolute bottom-6 right-6 p-4 rounded-full transition-all shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-amber-500 text-slate-900 hover:bg-amber-400 hover:scale-105'}`}
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
                </svg>
              </button>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleNextStep}
                className="px-16 py-5 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-900 rounded-full text-xl font-black hover:from-amber-500 hover:to-amber-400 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                誠心求籤
              </button>
            </div>
          </div>
        )}

        {step === AppStep.PICKER && (
          <div className="space-y-10 animate-in zoom-in duration-700 text-center">
            <div>
              <h2 className="text-3xl font-bold text-amber-400 mb-2">天意就在一念之間 ✨</h2>
              <p className="text-slate-400 mb-8">閉上眼睛，感受冥冥之中的引導，選一個字母吧。</p>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-4">
              {randomSeeds.map((seed) => (
                <button
                  key={seed.letter}
                  onClick={() => handlePick(seed.letter)}
                  className="aspect-square flex items-center justify-center border border-slate-700 bg-slate-900/30 rounded-2xl text-2xl font-black text-amber-200 hover:bg-amber-500 hover:text-slate-900 hover:border-amber-400 transition-all transform hover:scale-110 hover:-rotate-6 shadow-md"
                >
                  {seed.letter}
                </button>
              ))}
            </div>

            <div className="pt-10 border-t border-slate-700/50 flex flex-col items-center gap-4">
              <div className="flex gap-4">
                <button
                  onClick={generateNewSeeds}
                  className="px-4 py-2 bg-slate-800 text-amber-500/80 rounded-full text-xs hover:bg-slate-700 hover:text-amber-400 transition-all flex items-center border border-slate-700"
                >
                  <span className="mr-1">🔄</span> 重新洗牌
                </button>
                <button
                  onClick={() => setShowSeeds(!showSeeds)}
                  className="text-xs text-slate-500 hover:text-amber-400 transition-colors italic border-b border-transparent hover:border-amber-400"
                >
                  {showSeeds ? '閉嘴，大師不想讓你看底牌 🤫' : '想看電腦是怎麼生成的隨機數字嗎？🔍'}
                </button>
              </div>
              {showSeeds && (
                <div className="mt-6 grid grid-cols-5 text-[10px] gap-2 text-slate-500 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/30">
                  {randomSeeds.map(s => <span key={s.letter} className="bg-slate-800/50 p-1 rounded">{s.letter}: {s.number}</span>)}
                </div>
              )}
            </div>
          </div>
        )}

        {step === AppStep.RESULT && poemResult && (
          <div className="space-y-14 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex flex-col items-center">
              <div className="inline-block px-6 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-sm font-bold mb-8 uppercase tracking-widest">
                Oracle No. {poemResult.id}
              </div>
              <div className="space-y-6 text-center">
                {poemResult.content.map((line, idx) => (
                  <p key={idx} className="text-4xl md:text-5xl font-serif text-amber-100 tracking-[0.2em] drop-shadow-lg">{line}</p>
                ))}
              </div>
            </div>

            <div className="p-10 bg-slate-900/60 rounded-[2rem] border border-slate-700/50 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-2xl font-black text-amber-400 flex items-center italic">
                  <span className="text-3xl mr-3">🕶️</span> 大師開示
                </h3>

                {(audioBuffer || isGeneratingAudio) && (
                  <div className="flex gap-2">
                    {audioBlob && !isGeneratingAudio && (
                      <button
                        onClick={downloadAudio}
                        className="flex items-center justify-center w-10 h-10 rounded-full border border-amber-500/30 bg-slate-800 text-amber-400 hover:bg-slate-700 transition-all"
                        title="下載音檔"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => playMasterVoice()}
                      disabled={isGeneratingAudio}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full border border-amber-500/30 transition-all ${isPlaying ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'}`}
                    >
                      {isGeneratingAudio ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : isPlaying ? (
                        <><span className="text-xl">⏸️</span> <span className="text-sm font-bold">停止播放</span></>
                      ) : (
                        <><span className="text-xl">🔊</span> <span className="text-sm font-bold">播放大師總結</span></>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center py-16 space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">🔮</div>
                  </div>
                  <p className="text-amber-400/80 font-light italic animate-pulse">{currentLoadingMessage}</p>
                </div>
              ) : (
                <MarkdownRenderer content={interpretation} />
              )}
            </div>

            <div className="space-y-6">
              {poemImage && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative p-2 bg-gradient-to-b from-amber-500 to-amber-700 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-zoom-in" onClick={() => setIsImageZoomed(true)}>
                    <img src={poemImage} alt="籤詩意象" className="max-w-md w-full rounded-2xl grayscale-[0.2] hover:grayscale-0 transition-all duration-700" />
                  </div>
                  <p className="text-slate-500 text-xs tracking-widest uppercase">Sacred Art Generated by AI (點擊放大)</p>
                </div>
              )}

              <div className="flex flex-col items-center space-y-4 max-w-md mx-auto">
                <div className="w-full relative">
                  <input
                    type="text"
                    placeholder="不滿意？輸入自訂風格（如：賽博龐克、水墨畫...）"
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-900/80 border border-slate-700 rounded-2xl text-amber-100 placeholder:text-slate-600 focus:border-amber-500 outline-none transition-all shadow-inner"
                  />
                </div>

                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage}
                  className="group flex items-center space-x-3 px-10 py-4 bg-slate-900 border border-slate-700 text-amber-400 rounded-full hover:bg-amber-500 hover:text-slate-900 transition-all disabled:opacity-50 shadow-xl w-full justify-center"
                >
                  {isGeneratingImage ? (
                    <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="text-2xl group-hover:rotate-12 transition-transform">🎨</span>
                  )}
                  <span className="font-bold">{poemResult ? (poemImage ? '調整風格重新生成' : '生成專屬立體紙雕籤詩卡') : ''}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center pt-10 border-t border-slate-700/50 gap-6">
              <button
                onClick={downloadResult}
                className="w-full sm:w-auto px-10 py-4 bg-amber-500 text-slate-900 rounded-full font-black hover:bg-amber-400 transition-all flex items-center justify-center shadow-lg"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                存檔帶走，隨時自省
              </button>
              <button
                onClick={resetApp}
                className="w-full sm:w-auto px-10 py-4 bg-slate-700 text-amber-100 rounded-full font-bold hover:bg-slate-600 transition-all border border-slate-600 shadow-md"
              >
                換個煩惱再抽一次
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Zoom Modal */}
      {isImageZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
          onClick={() => setIsImageZoomed(false)}
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center">
            <img
              src={poemImage}
              alt="籤詩意象大圖"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border-2 border-slate-700"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-amber-500/80 mt-4 font-light tracking-widest uppercase text-sm">Sacred Art Generated by AI</p>
            <button
              className="absolute -top-12 right-0 text-slate-400 hover:text-white p-2"
              onClick={() => setIsImageZoomed(false)}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <footer className="mt-16 text-slate-500 text-sm text-center space-y-2">
        <p className="tracking-widest">© 靈曦籤苑 · Powered by Gemini AI Intelligence</p>
        <p className="hover:text-amber-400 transition-colors">
          <a href="https://weisfx0705.github.io/chiawei/" target="_blank" rel="noopener noreferrer">
            義守大學陳嘉暐老師開發
          </a>
        </p>
        <p className="opacity-40 italic">「大師的話僅供參考，真的受傷了大師是不賠的。」💁‍♂️</p>
        <p className="opacity-30 text-xs">Version: 12/19/2025</p>
      </footer>
    </div>
  );
};

export default App;
