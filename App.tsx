import React, { useState, useEffect } from 'react';
import { extractExifData, cleanImageMetadata, fileToBase64 } from './services/imageService';
import { analyzeImageWithGemini } from './services/geminiService';
import { ProcessedImage, TabView } from './types';
import CameraCapture from './components/CameraCapture';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [data, setData] = useState<ProcessedImage | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>(TabView.OVERVIEW);

  useEffect(() => {
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleImageSelect = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    
    // Init state
    const newImage: ProcessedImage = {
      id: Date.now().toString(),
      file,
      previewUrl,
      exif: null,
      aiAnalysis: null,
      isProcessing: true,
      error: undefined,
    };
    setData(newImage);
    setShowCamera(false);

    try {
      // 1. Extract EXIF (Fast, offline)
      const exifData = await extractExifData(file);
      
      setData(prev => prev ? { ...prev, exif: exifData } : null);

      // 2. AI Analysis (Async, online)
      const base64 = await fileToBase64(file);
      const aiResult = await analyzeImageWithGemini(base64);

      setData(prev => prev ? { 
        ...prev, 
        aiAnalysis: aiResult,
        isProcessing: false 
      } : null);

    } catch (err) {
      console.error(err);
      setData(prev => prev ? { 
        ...prev, 
        isProcessing: false,
        error: "Failed to process image fully." 
      } : null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageSelect(e.dataTransfer.files[0]);
    }
  };

  const handlePrivacyClean = async () => {
    if (!data?.previewUrl) return;
    try {
      const blob = await cleanImageMetadata(data.previewUrl);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clean_${data.file.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      alert("Failed to create clean image.");
    }
  };

  // --- UI Components for Results ---

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Date Taken</p>
          <p className="text-lg font-medium">
            {data?.exif?.dateTimeOriginal || <span className="text-slate-400 italic">Unknown</span>}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Camera</p>
          <p className="text-lg font-medium truncate">
            {data?.exif?.model || <span className="text-slate-400 italic">Unknown</span>}
          </p>
        </div>
      </div>

      {data?.aiAnalysis && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold mb-3">AI Insights</h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-brand-100 text-brand-900 rounded-full text-sm font-medium">
              {data.aiAnalysis.sceneType}
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-900 rounded-full text-sm font-medium">
              {data.aiAnalysis.imageCategory}
            </span>
             <span className="px-3 py-1 bg-indigo-100 text-indigo-900 rounded-full text-sm font-medium">
              {data.aiAnalysis.peopleCount} Person(s)
            </span>
            {data.aiAnalysis.objects.slice(0, 5).map((obj, i) => (
              <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-sm">
                {obj}
              </span>
            ))}
          </div>
        </div>
      )}

      {data?.exif?.latitude && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-100">Location Data Found</p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {data.exif.latitude.toFixed(4)}, {data.exif.longitude?.toFixed(4)}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderExif = () => {
    if (!data?.exif) return <div className="text-center p-8 text-slate-500">No EXIF data found.</div>;
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-medium">
            <tr>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {Object.entries(data.exif).map(([key, value]) => (
              <tr key={key}>
                <td className="px-4 py-3 font-medium capitalize text-slate-700 dark:text-slate-300">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">
                  {value?.toString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAiAnalysis = () => {
    if (!data?.aiAnalysis) return <div className="text-center p-8 animate-pulse text-slate-400">Analyzing image...</div>;
    const { authenticity, faceEmotion, dominantColors, isSafe } = data.aiAnalysis;
    
    return (
      <div className="space-y-4">
        {/* Authenticity Card */}
        <div className={`p-4 rounded-xl border ${authenticity.isLikelyEdited ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-green-50 border-green-200 dark:bg-green-900/20'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-lg">Authenticity Check</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${authenticity.isLikelyEdited ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
              {authenticity.isLikelyEdited ? 'Edited' : 'Original'}
            </span>
          </div>
          <p className="text-sm mb-2">{authenticity.reason}</p>
          <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${authenticity.score}%` }}></div>
          </div>
          <p className="text-xs text-right mt-1 text-slate-500">Confidence Score</p>
        </div>

        {/* Safety & Emotion */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
             <p className="text-xs text-slate-500 uppercase font-bold">Content Safety</p>
             <p className={`text-lg font-bold ${isSafe ? 'text-green-600' : 'text-red-600'}`}>
               {isSafe ? 'Safe' : 'NSFW / Unsafe'}
             </p>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
             <p className="text-xs text-slate-500 uppercase font-bold">Emotion</p>
             <p className="text-lg font-bold">{faceEmotion}</p>
           </div>
        </div>

        {/* Colors */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
           <p className="text-xs text-slate-500 uppercase font-bold mb-3">Dominant Colors</p>
           <div className="flex gap-2">
             {dominantColors.map((c, i) => (
               <div key={i} className="flex flex-col items-center gap-1">
                 <div className="w-10 h-10 rounded-full shadow-inner border border-slate-100" style={{ backgroundColor: c }}></div>
                 <span className="text-[10px] font-mono">{c}</span>
               </div>
             ))}
           </div>
        </div>
      </div>
    );
  };

  const renderOcr = () => {
    if (!data?.aiAnalysis) return <div className="text-center p-8 animate-pulse text-slate-400">Processing OCR...</div>;
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[200px]">
        {data.aiAnalysis.ocrText ? (
          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 dark:text-slate-300">
            {data.aiAnalysis.ocrText}
          </pre>
        ) : (
          <div className="text-center text-slate-400 italic mt-10">No text detected in image</div>
        )}
      </div>
    );
  };

  const renderPrivacy = () => (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
        <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Privacy Mode</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
          Strip hidden EXIF data, GPS coordinates, and camera details to share your image safely.
        </p>
        <button 
          onClick={handlePrivacyClean}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-lg w-full max-w-xs transition-colors shadow-lg shadow-brand-500/30"
        >
          Clean & Download Image
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-12 selection:bg-brand-200 selection:text-brand-900">
      {showCamera && <CameraCapture onCapture={handleImageSelect} onClose={() => setShowCamera(false)} />}
      
      {/* Header */}
      <header className="px-6 py-5 flex justify-between items-center sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">AI</div>
          <h1 className="font-bold text-xl tracking-tight hidden sm:block">Metadata Extractor</h1>
        </div>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)} 
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="container mx-auto max-w-lg px-4 pt-6">
        
        {!data ? (
          // --- UPLOAD STATE ---
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div 
              className="w-full h-64 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center bg-white dark:bg-slate-900 hover:border-brand-500 transition-colors cursor-pointer group"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input 
                id="file-input"
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => e.target.files && handleImageSelect(e.target.files[0])}
              />
              <div className="w-16 h-16 bg-brand-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Select Image</p>
              <p className="text-sm text-slate-400">or drag and drop</p>
            </div>

            <div className="w-full flex items-center gap-4">
               <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
               <span className="text-slate-400 text-sm">OR</span>
               <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            </div>

            <button 
              onClick={() => setShowCamera(true)}
              className="w-full py-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Open Camera
            </button>
          </div>
        ) : (
          // --- RESULTS STATE ---
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            {/* Image Card */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg bg-black group">
              <img src={data.previewUrl} alt="Preview" className="w-full h-64 object-contain bg-slate-900" />
              <button 
                onClick={() => setData(null)}
                className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {data.isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                  <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="font-medium animate-pulse">Analyzing with AI...</p>
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-x-auto no-scrollbar">
              {Object.values(TabView).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === tab 
                    ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[300px]">
              {activeTab === TabView.OVERVIEW && renderOverview()}
              {activeTab === TabView.EXIF && renderExif()}
              {activeTab === TabView.AI_ANALYSIS && renderAiAnalysis()}
              {activeTab === TabView.OCR && renderOcr()}
              {activeTab === TabView.PRIVACY && renderPrivacy()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;