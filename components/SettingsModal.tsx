import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    onSave: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, apiKey, onSave }) => {
    const [inputKey, setInputKey] = useState(apiKey);
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        setInputKey(apiKey);
    }, [apiKey, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center">
                    <span className="mr-2">⚙️</span> 設置 API Key
                </h2>

                <div className="space-y-6">
                    <div>
                        <label className="block text-slate-300 mb-2 font-medium">Google Gemini API Key</label>
                        <input
                            type="password"
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            placeholder="貼上您的 API Key..."
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        />
                        <p className="text-slate-500 text-sm mt-2">
                            您的 Key 僅會儲存在本地瀏覽器中，不會上傳至任何伺服器。
                        </p>
                    </div>

                    <div className="border-t border-slate-700 pt-6">
                        <button
                            onClick={() => setShowTutorial(!showTutorial)}
                            className="flex items-center text-amber-500 hover:text-amber-400 font-medium transition-colors"
                        >
                            <span className="mr-2">{showTutorial ? '▼' : '▶'}</span>
                            如何獲取免費的 Google API Key？
                        </button>

                        {showTutorial && (
                            <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 text-slate-300 space-y-3 text-sm animate-in slide-in-from-top-2">
                                <p>簡單 3 步獲取您的專屬 Key：</p>
                                <ol className="list-decimal list-inside space-y-2 ml-2">
                                    <li>
                                        前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a> 並登入 Google 帳號。
                                    </li>
                                    <li>
                                        點擊左上角的 <strong>"Create API key"</strong> 按鈕。
                                    </li>
                                    <li>
                                        選擇 <strong>"Create API key in new project"</strong>，複製生成的字串（以 AIza 開頭）。
                                    </li>
                                </ol>
                                <div className="bg-slate-800 p-3 rounded-lg mt-3 text-xs text-slate-400">
                                    💡 提示：Google 目前提供免費額度，足夠個人日常使用。
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={() => {
                                onSave(inputKey);
                                onClose();
                            }}
                            className="px-6 py-2 rounded-full bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                        >
                            儲存設定
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
