
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
  ChevronDown
} from 'lucide-react';
import { ExtractedFile, FileStatus, ExtractionMethod } from './types';
import { extractTextWithAI } from './services/geminiService';

// Main App Component
const App: React.FC = () => {
  const [files, setFiles] = useState<ExtractedFile[]>([]);
  const [activeTab, setActiveTab] = useState<'individual' | 'aggregated'>('individual');
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fix: Explicitly type the uploaded files as File[] to resolve TS errors regarding 'unknown' type properties.
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFileList = e.target.files;
    if (!uploadedFileList) return;

    const uploadedFiles = Array.from(uploadedFileList);

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
    
    // Process each file automatically
    // Fix: Safely find and pass the raw File object to processFile.
    newFiles.forEach(f => {
      const rawFile = uploadedFiles.find(raw => raw.name === f.name);
      if (rawFile) {
        processFile(f, rawFile);
      }
    });
  };

  const processFile = async (fileState: ExtractedFile, rawFile: File) => {
    setFiles(prev => prev.map(f => f.id === fileState.id ? { ...f, status: FileStatus.PROCESSING, progress: 10 } : f));

    try {
      // Step 1: Read file as Data URL
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(rawFile);
      });
      const fileData = await fileDataPromise;

      // Hybrid Logic Simulation:
      // For PDFs, we could try pdf.js first. For this production-ready version, 
      // we leverage Gemini Flash which is superior for both direct text and OCR.
      const extractedText = await extractTextWithAI(fileData, rawFile.type);

      setFiles(prev => prev.map(f => f.id === fileState.id ? { 
        ...f, 
        content: extractedText, 
        status: FileStatus.COMPLETED, 
        progress: 100,
        method: rawFile.type.includes('image') ? ExtractionMethod.AI_OCR : ExtractionMethod.HYBRID
      } : f));
    } catch (error: any) {
      setFiles(prev => prev.map(f => f.id === fileState.id ? { 
        ...f, 
        status: FileStatus.ERROR, 
        error: error.message 
      } : f));
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
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
      .map(f => `FILE: ${f.name}\n----------------------------\n${f.content}\n\n`)
      .join('\n');
  }, [files]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-slate-900 text-white p-6 flex flex-col border-r border-slate-800">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">AI Text Agent</h1>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">
            Upload Documents
          </label>
          <div className="relative group">
            <input 
              type="file" 
              multiple 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              accept=".pdf,.png,.jpg,.jpeg,.docx"
            />
            <div className="border-2 border-dashed border-slate-700 group-hover:border-indigo-500 rounded-xl p-6 transition-all bg-slate-800/50 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-500 group-hover:text-indigo-400" />
              <p className="text-sm font-medium">Click or drag files</p>
              <p className="text-xs text-slate-500 mt-1">PDF, Image, Word</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Queue ({files.length})</p>
          {files.map(file => (
            <div key={file.id} className="group flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-700/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className={`w-4 h-4 flex-shrink-0 ${file.status === FileStatus.ERROR ? 'text-red-400' : 'text-indigo-400'}`} />
                <span className="text-sm truncate pr-2">{file.name}</span>
              </div>
              <button 
                onClick={() => removeFile(file.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {files.length === 0 && (
            <p className="text-sm text-slate-600 italic">No files in queue.</p>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-500">
            Powered by Gemini 3 Flash
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-slate-50">
        <header className="h-16 border-b bg-white px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('individual')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all ${activeTab === 'individual' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Layout className="w-4 h-4" />
              Individual Views
            </button>
            <button 
              onClick={() => setActiveTab('aggregated')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all ${activeTab === 'aggregated' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Layers className="w-4 h-4" />
              Aggregated View
            </button>
          </div>
          {activeTab === 'aggregated' && files.some(f => f.status === FileStatus.COMPLETED) && (
            <button 
              onClick={() => downloadText(aggregatedText, 'aggregated_documents')}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download All
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'individual' ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {files.length === 0 ? (
                <div className="text-center py-20 bg-white border rounded-2xl border-dashed border-slate-300">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-slate-400">Ready to Extract</h2>
                  <p className="text-slate-400 text-sm mt-1">Upload files to begin the hybrid AI extraction process.</p>
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
            <div className="max-w-5xl mx-auto">
              {files.some(f => f.status === FileStatus.COMPLETED) ? (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[70vh]">
                  <div className="bg-slate-50 px-6 py-4 border-b flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-widest">Master Corpus</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(aggregatedText);
                        alert("Copied to clipboard!");
                      }}
                      className="text-slate-500 hover:text-indigo-600 transition-colors"
                      title="Copy All"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea 
                    value={aggregatedText}
                    readOnly
                    className="flex-1 p-8 text-slate-700 font-mono text-sm leading-relaxed resize-none focus:outline-none bg-slate-50/30"
                  />
                </div>
              ) : (
                <div className="text-center py-20">
                  <Layers className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400">Complete processing to see aggregated text.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Sub-component for individual file cards
interface ExtractionCardProps {
  file: ExtractedFile;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (content: string) => void;
  onDownload: () => void;
}

const ExtractionCard: React.FC<ExtractionCardProps> = ({ file, isExpanded, onToggle, onUpdate, onDownload }) => {
  return (
    <div className={`bg-white border rounded-xl transition-all overflow-hidden ${isExpanded ? 'ring-2 ring-indigo-500/20 shadow-lg' : 'hover:shadow-md border-slate-200'}`}>
      <div 
        className="px-6 py-4 flex items-center justify-between cursor-pointer group select-none"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`p-2 rounded-lg ${file.status === FileStatus.ERROR ? 'bg-red-50' : 'bg-slate-100'}`}>
            {file.status === FileStatus.PROCESSING ? (
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            ) : file.status === FileStatus.COMPLETED ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : file.status === FileStatus.ERROR ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <FileText className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">{file.name}</h3>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
              {file.status === FileStatus.COMPLETED && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded">
                  {file.method}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {file.status === FileStatus.COMPLETED && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 p-6 bg-slate-50/50">
          {file.status === FileStatus.PROCESSING ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600">Analyzing document structure...</p>
              <p className="text-xs text-slate-400 mt-1">Applying Hybrid AI Logic & OCR</p>
            </div>
          ) : file.status === FileStatus.ERROR ? (
            <div className="bg-red-50 border border-red-100 p-4 rounded-lg flex gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">Failed to extract: {file.error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Extracted Text</label>
                <span className="text-xs text-slate-400 italic">User editable</span>
              </div>
              <textarea 
                value={file.content}
                onChange={(e) => onUpdate(e.target.value)}
                className="w-full h-96 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm leading-relaxed text-slate-700 bg-white"
                placeholder="No text extracted yet..."
              />
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(file.content);
                    alert("Content copied!");
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button 
                  onClick={onDownload}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Save as TXT
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
