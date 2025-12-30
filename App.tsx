
import React, { useState, useCallback, useMemo } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Layers, 
  Layout, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Copy,
  ChevronRight,
  ChevronDown,
  FileSearch,
  Settings
} from 'lucide-react';
import { ExtractedFile, FileStatus, ExtractionMethod } from './types';
import { extractTextWithAI } from './services/geminiService';

const App: React.FC = () => {
  const [files, setFiles] = useState<ExtractedFile[]>([]);
  const [activeTab, setActiveTab] = useState<'individual' | 'aggregated'>('individual');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFileList = e.target.files;
    if (!uploadedFileList) return;

    // Fix: Explicitly cast to File[] to ensure properties like 'name' are correctly inferred by the compiler.
    // Line 46 error fix: Property 'name' does not exist on type 'unknown'.
    const uploadedFiles = Array.from(uploadedFileList) as File[];
    const newFiles: ExtractedFile[] = uploadedFiles.map((file: File) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      size: file.size,
      content: '',
      status: FileStatus.IDLE,
      method: ExtractionMethod.HYBRID,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    
    newFiles.forEach(f => {
      // Fix: Now raw is correctly typed as File, resolving the issue at line 47.
      const rawFile = uploadedFiles.find(raw => raw.name === f.name);
      if (rawFile) processFile(f, rawFile);
    });
  };

  const processFile = async (fileState: ExtractedFile, rawFile: File) => {
    setFiles(prev => prev.map(f => f.id === fileState.id ? { ...f, status: FileStatus.PROCESSING } : f));

    try {
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(rawFile);
      });
      const fileData = await fileDataPromise;

      const extractedText = await extractTextWithAI(fileData, rawFile.type);

      setFiles(prev => prev.map(f => f.id === fileState.id ? { 
        ...f, 
        content: extractedText, 
        status: FileStatus.COMPLETED, 
        progress: 100
      } : f));
    } catch (error: any) {
      setFiles(prev => prev.map(f => f.id === fileState.id ? { 
        ...f, 
        status: FileStatus.ERROR, 
        error: error.message 
      } : f));
    }
  };

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.split('.')[0]}_extracted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const aggregatedText = useMemo(() => {
    return files
      .filter(f => f.status === FileStatus.COMPLETED)
      .map(f => `--- DOCUMENT: ${f.name} ---\n${f.content}\n\n`)
      .join('\n');
  }, [files]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans selection:bg-indigo-100">
      {/* Sidebar - Pro Design */}
      <aside className="w-full md:w-80 bg-slate-900 text-white p-6 flex flex-col border-r border-slate-800 shadow-xl z-30">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <FileSearch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">AI OCR Agent</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">Enterprise Edition</p>
          </div>
        </div>

        <div className="mb-10">
          <div className="relative group">
            <input 
              type="file" 
              multiple 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              accept=".pdf,.png,.jpg,.jpeg,.tiff"
            />
            <div className="border-2 border-dashed border-slate-700 group-hover:border-indigo-400 group-hover:bg-slate-800/50 rounded-2xl p-8 transition-all duration-300 text-center">
              <Upload className="w-10 h-10 mx-auto mb-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              <p className="text-sm font-bold text-slate-300">إسقاط الملفات هنا</p>
              <p className="text-[10px] text-slate-500 mt-2">يدعم PDF, الصور (بما فيها TIFF)</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">ملفات القيد ({files.length})</p>
            {files.length > 0 && (
              <button onClick={() => setFiles([])} className="text-[10px] text-red-400 hover:text-red-300 transition-colors font-bold uppercase">مسح الكل</button>
            )}
          </div>
          {files.map(file => (
            <div key={file.id} className="group flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition-all duration-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-1.5 rounded-md ${file.status === FileStatus.ERROR ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                  <FileText className="w-4 h-4 flex-shrink-0" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium truncate block pr-2">{file.name}</span>
                  <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <button 
                onClick={() => removeFile(file.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {files.length === 0 && (
            <div className="py-10 text-center opacity-40">
              <div className="w-12 h-12 border-2 border-slate-700 border-dashed rounded-full mx-auto mb-3 flex items-center justify-center">
                <Settings className="w-5 h-5 text-slate-600 animate-spin-slow" />
              </div>
              <p className="text-xs text-slate-500 font-medium">بانتظار رفع الملفات...</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-10 flex items-center justify-between flex-shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('individual')}
              className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'individual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Layout className="w-4 h-4" />
              عرض منفصل
            </button>
            <button 
              onClick={() => setActiveTab('aggregated')}
              className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'aggregated' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Layers className="w-4 h-4" />
              المجمع النصي
            </button>
          </div>
          
          <div className="flex items-center gap-4">
             {activeTab === 'aggregated' && files.some(f => f.status === FileStatus.COMPLETED) && (
              <button 
                onClick={() => downloadText(aggregatedText, 'aggregated_extraction')}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                <Download className="w-4 h-4" />
                تصدير المجمع
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          {activeTab === 'individual' ? (
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
              {files.length === 0 ? (
                <div className="text-center py-32 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">ابدأ الاستخراج الآن</h2>
                  <p className="text-slate-500 mt-2 max-w-sm mx-auto">ارفع ملفات PDF أو صور ليقوم الوكيل الذكي بتحويلها إلى نصوص بدقة عالية جداً.</p>
                </div>
              ) : (
                files.map(file => (
                  <ExtractionCard 
                    key={file.id} 
                    file={file} 
                    isExpanded={expandedId === file.id}
                    onToggle={() => setExpandedId(expandedId === file.id ? null : file.id)}
                    onUpdate={(newContent) => {
                      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, content: newContent } : f));
                    }}
                    onDownload={() => downloadText(file.content, file.name)}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="max-w-5xl mx-auto h-full flex flex-col">
              {files.some(f => f.status === FileStatus.COMPLETED) ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                  <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">المستودع الرقمي</span>
                      <h3 className="text-lg font-bold text-slate-800">النص المجمع لكل المستندات</h3>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(aggregatedText);
                        alert("تم النسخ بنجاح!");
                      }}
                      className="p-2.5 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm font-bold"
                    >
                      <Copy className="w-4 h-4" />
                      نسخ المحتوى
                    </button>
                  </div>
                  <textarea 
                    value={aggregatedText}
                    readOnly
                    dir="auto"
                    className="flex-1 p-10 text-slate-700 font-mono text-sm leading-relaxed resize-none focus:outline-none bg-white selection:bg-indigo-50"
                  />
                </div>
              ) : (
                <div className="text-center py-32">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 opacity-40">
                    <Layers className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-400 font-medium">قم بمعالجة ملف واحد على الأقل لرؤية النتائج المجمعة.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

interface ExtractionCardProps {
  file: ExtractedFile;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (content: string) => void;
  onDownload: () => void;
}

const ExtractionCard: React.FC<ExtractionCardProps> = ({ file, isExpanded, onToggle, onUpdate, onDownload }) => {
  return (
    <div className={`bg-white border rounded-2xl transition-all duration-300 overflow-hidden ${isExpanded ? 'ring-4 ring-indigo-500/10 shadow-2xl border-indigo-200' : 'hover:shadow-lg border-slate-200 shadow-sm'}`}>
      <div 
        className={`px-6 py-5 flex items-center justify-between cursor-pointer group select-none transition-colors ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-5 min-w-0">
          <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${
            file.status === FileStatus.PROCESSING ? 'bg-indigo-100 text-indigo-600' : 
            file.status === FileStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' :
            file.status === FileStatus.ERROR ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'
          }`}>
            {file.status === FileStatus.PROCESSING ? <Loader2 className="w-6 h-6 animate-spin" /> :
             file.status === FileStatus.COMPLETED ? <CheckCircle className="w-6 h-6" /> :
             file.status === FileStatus.ERROR ? <AlertCircle className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 truncate text-base">{file.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-tighter">{(file.size / 1024).toFixed(1)} KB</span>
              {file.status === FileStatus.COMPLETED && (
                <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-tighter bg-indigo-100/50 px-2 py-0.5 rounded">
                  AI-OCR OPTIMIZED
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {file.status === FileStatus.COMPLETED && !isExpanded && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 shadow-sm"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 p-8 bg-white">
          {file.status === FileStatus.PROCESSING ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                 <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                 </div>
              </div>
              <p className="text-lg font-bold text-slate-700">جاري تحليل المستند...</p>
              <p className="text-sm text-slate-400 mt-2">نستخدم ذكاء اصطناعي هجين للتعرف على الخطوط والتنسيقات.</p>
            </div>
          ) : file.status === FileStatus.ERROR ? (
            <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex gap-4 text-red-700 animate-shake">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-bold">خطأ في الاستخراج</p>
                <p className="text-sm mt-1">{file.error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-slate-600">النص المستخرج (قابل للتحرير)</span>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => {
                      navigator.clipboard.writeText(file.content);
                      alert("تم النسخ!");
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    نسخ
                  </button>
                </div>
              </div>
              
              <textarea 
                value={file.content}
                onChange={(e) => onUpdate(e.target.value)}
                dir="auto"
                className="w-full h-80 p-6 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-mono text-sm leading-relaxed text-slate-700 bg-slate-50/30 selection:bg-indigo-100"
                placeholder="بانتظار ظهور النص..."
              />
              
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={onDownload}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-lg transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  حفظ كملف نصي (TXT)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
