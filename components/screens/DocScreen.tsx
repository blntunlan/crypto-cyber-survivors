import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, ChevronRight, Terminal, Share2, Search, Power } from 'lucide-react';
import * as CardIcons from '../icons/CardIcons';
import { IconShield } from '../icons/CardIcons';

interface DocItem {
  text: string;
  link: string;
}

interface DocSection {
  text: string;
  items: DocItem[];
}

interface DocScreenProps {
  onClose: () => void;
}

export const DocScreen: React.FC<DocScreenProps> = ({ onClose }) => {
  const [navigation, setNavigation] = useState<{ sidebar: DocSection[] } | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<string>('/docs/SYSTEM_OVERVIEW');
  const [content, setContent] = useState<string>('LOADING DOCUMENT...');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Navigation Load
  useEffect(() => {
    fetch('/docs/navigation.json')
      .then(res => res.json())
      .then(data => setNavigation(data))
      .catch(err => {
        console.error('Failed to load navigation:', err);
        // Fallback or error state
      });
  }, []);

  // Fetch Content from Markdown files
  useEffect(() => {
    setLoading(true);
    let docPath = selectedDoc;

    // Ensure path starts with / for relative fetching from public
    if (!docPath.startsWith('/')) {
      docPath = '/' + docPath;
    }

    // Ensure .md extension
    if (!docPath.endsWith('.md')) {
      docPath = `${docPath}.md`;
    }

    fetch(docPath)
      .then(res => {
        if (!res.ok) throw new Error('Document not found');
        return res.text();
      })
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load doc:', err);
        setContent(
          `# DOCUMENT NOT FOUND\n\nPath: ${selectedDoc}\n\nThis protocol documentation is being decrypted and will be available soon.`
        );
        setLoading(false);
      });
  }, [selectedDoc]);

  const handleDocSelect = (link: string) => {
    // Standardize: ensure path starts with /docs/ or is /README
    let target = link;
    if (target === 'README' || target === '/README') {
      setSelectedDoc('/README');
    } else {
      if (!target.startsWith('/')) target = '/' + target;
      setSelectedDoc(target);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#020617] text-slate-300 font-mono flex flex-col md:flex-row overflow-hidden border-t-2 border-[#b22222]/50 shadow-[0_-10px_50px_rgba(178,34,34,0.2)]"
    >
      {/* Sidebar - Navigation */}
      <div className="w-full md:w-80 border-r border-[#b22222]/20 flex flex-col bg-black/40 backdrop-blur-xl">
        <div className="p-6 border-b border-[#b22222]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="text-[#d6b85c] w-5 h-5" />
            <span className="font-display font-black tracking-tighter text-white">
              DOCS_V2.0
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors md:hidden"
          >
            <Power className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search Protocol..."
              className="w-full bg-white/5 border border-white/10 rounded-sm py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-[#d6b85c] focus:outline-none transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {navigation?.sidebar.map((section, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b22222] opacity-80">
                {section.text}
              </h3>
              <div className="space-y-1">
                {section.items.map((item, itemIdx) => (
                  <button
                    key={itemIdx}
                    onClick={() => handleDocSelect(item.link)}
                    className={`w-full text-left px-3 py-2 rounded-sm text-xs transition-all flex items-center justify-between group
                      ${
                        selectedDoc === item.link
                          ? 'bg-[#d6b85c]/10 text-white border-l-2 border-[#d6b85c]'
                          : 'text-slate-500 hover:text-slate-100 hover:bg-white/5'
                      }`}
                  >
                    <span>{item.text}</span>
                    {selectedDoc === item.link && (
                      <ChevronRight className="w-3 h-3 text-[#d6b85c]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-[#b22222]/20 bg-black/20 text-[10px] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">CONNECTION:</span>
            <span className="text-green-500">ENCRYPTED</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">LATENCY:</span>
            <span className="text-[#d6b85c]">8MS</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed opacity-[0.98]">
        {/* Header toolbar */}
        <div className="h-16 border-b border-[#b22222]/20 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest text-[#d6b85c]">
            <Terminal className="w-4 h-4" />
            <span>{selectedDoc}</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-white/5 rounded-sm transition-colors group">
              <Share2 className="w-4 h-4 text-slate-500 group-hover:text-white" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#b22222]/20 hover:bg-[#b22222]/40 text-[#b22222] font-black text-xs uppercase tracking-widest border border-[#b22222]/30 transition-all flex items-center gap-2"
            >
              <Power className="w-4 h-4" />
              EXIT_TERMINAL
            </button>
          </div>
        </div>

        {/* Markdown Renderer Area */}
        <div className="flex-1 overflow-y-auto p-8 md:p-16 custom-scrollbar scroll-smooth">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center space-y-4"
              >
                <div className="w-12 h-12 border-2 border-slate-800 border-t-[#d6b85c] rounded-full animate-spin" />
                <span className="text-xs uppercase tracking-widest text-slate-500">
                  Decrypting Protocol Content...
                </span>
              </motion.div>
            ) : (
              <motion.div
                key={selectedDoc}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-4xl mx-auto space-y-8 pb-32"
              >
                {/* Custom Markdown Renderer Components */}
                {renderDocContent(content, handleDocSelect)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scrabble/Scanline Overlays */}
        <div className="absolute inset-x-0 h-[1px] bg-[#d6b85c]/10 top-0 pointer-events-none" />
        <div className="absolute inset-x-0 h-[1px] bg-[#b22222]/10 bottom-0 pointer-events-none" />
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #b2222250; border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #b2222290; }
        
        @font-face {
          font-family: 'Orbitron';
          src: url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;900&display=swap');
        }
        .font-display { font-family: 'Orbitron', sans-serif; }
      `}</style>
    </motion.div>
  );
};

// Helper to render code blocks
function renderCodeBlock(code: string, language?: string) {
  return (
    <div key={Math.random()} className="my-6 group relative">
      <div className="absolute -top-3 left-4 px-2 py-0.5 bg-[#b22222] text-[8px] font-black text-white uppercase tracking-widest z-10">
        {language ?? 'TERMINAL'}
      </div>
      <pre className="p-6 bg-black border border-[#b22222]/20 rounded-sm overflow-x-auto custom-scrollbar shadow-2xl">
        <code className="text-xs text-slate-300 leading-relaxed font-mono block">
          {code}
        </code>
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            void navigator.clipboard.writeText(code);
          }}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-sm text-[10px] text-slate-500 hover:text-white transition-all uppercase font-black"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

// Helper to render "Markdown-ish" content using React components
function renderDocContent(content: string, onLinkClick: (link: string) => void) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentCodeBlock: string[] | null = null;
  let codeLanguage = '';

  // Internal link cleaning helper
  const cleanLink = (url: string) => {
    return url.replace(/^\//, '').replace(/\.md$/, '');
  };

  // Helper for inline parsing (links, bold)
  const parseInline = (text: string) => {
    const parts: (string | React.JSX.Element)[] = [];
    let lastIndex = 0;

    // Bold Regex: **text**
    // Link Regex: [label](url)
    // Icon Regex: :IconName:
    const combinedRegex = /(\*\*.*?\*\*|\[.*?\]\(.*?\)|:([A-Z][a-zA-Z]+):)/g;
    let match;

    while ((match = combinedRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const raw = match[0];
      if (raw.startsWith('**')) {
        parts.push(
          <span key={match.index} className="font-bold text-slate-200">
            {raw.slice(2, -2)}
          </span>
        );
      } else if (raw.startsWith('[')) {
        const labelMatch = /\[(.*?)\]/.exec(raw);
        const urlMatch = /\((.*?)\)/.exec(raw);
        if (labelMatch && urlMatch) {
          const label = labelMatch[1] ?? 'Link';
          const url = urlMatch[1] ?? '#';
          parts.push(
            <button
              key={match.index}
              onClick={() => {
                const target = cleanLink(url);
                if (target.startsWith('docs') || target === 'README') {
                  onLinkClick(target.startsWith('docs') ? `/${target}` : '/README');
                } else {
                  window.open(url, '_blank');
                }
              }}
              className="text-[#d6b85c] hover:underline transition-all font-bold"
            >
              {label}
            </button>
          );
        }
      } else if (raw.startsWith(':')) {
        const iconName = match[2];
        const IconComponent = (CardIcons as Record<string, React.ElementType>)[
          `Icon${iconName}`
        ];
        if (IconComponent) {
          parts.push(
            <IconComponent
              key={match.index}
              className="inline-block w-4 h-4 mx-1 align-text-bottom"
              color="currentColor"
            />
          );
        } else {
          parts.push(raw);
        }
      }
      lastIndex = combinedRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    // Handle Code Blocks
    if (line.startsWith('```')) {
      if (currentCodeBlock === null) {
        currentCodeBlock = [];
        codeLanguage = line.slice(3).trim();
      } else {
        elements.push(renderCodeBlock(currentCodeBlock.join('\n'), codeLanguage));
        currentCodeBlock = null;
        codeLanguage = '';
      }
      continue;
    }

    if (currentCodeBlock !== null) {
      currentCodeBlock.push(line);
      continue;
    }

    // Header 1
    if (line.startsWith('# ')) {
      elements.push(
        <h1
          key={i}
          className="text-4xl md:text-6xl font-black font-display text-white uppercase italic tracking-tighter mb-12 border-b-2 border-[#b22222] pb-6"
        >
          {parseInline(line.replace('# ', ''))}
        </h1>
      );
      continue;
    }
    // Header 2
    if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={i}
          className="text-xl md:text-2xl font-black font-display text-[#d6b85c] uppercase tracking-wider mb-6 mt-16 flex items-center gap-3"
        >
          <ChevronRight className="w-5 h-5" />
          {parseInline(line.replace('## ', ''))}
        </h2>
      );
      continue;
    }
    // Important Box
    if (line.startsWith('> [!IMPORTANT]')) {
      continue;
    }
    if (line.startsWith('> ')) {
      const text = line.replace('> ', '');
      if (text.includes('**Status**')) {
        elements.push(
          <div
            key={i}
            className="p-4 bg-[#b22222]/10 border-l-4 border-[#b22222] flex items-center gap-4 mb-8"
          >
            <IconShield className="w-6 h-6" color="#b22222" />
            <div className="text-xs font-mono uppercase tracking-widest text-[#b22222]">
              {parseInline(text)}
            </div>
          </div>
        );
      } else {
        elements.push(
          <blockquote
            key={i}
            className="border-l-2 border-slate-700 pl-4 py-1 text-slate-500 italic mb-4"
          >
            {parseInline(text)}
          </blockquote>
        );
      }
      continue;
    }
    // List Items
    if (line.startsWith('- ')) {
      const cleanLine = line.replace('- ', '');
      elements.push(
        <div key={i} className="flex gap-3 mb-2 group">
          <div className="w-1.5 h-1.5 mt-1.5 bg-[#d6b85c]/40 group-hover:bg-[#d6b85c] transition-colors flex-shrink-0" />
          <div className="text-sm leading-relaxed text-slate-400">
            {parseInline(cleanLine)}
          </div>
        </div>
      );
      continue;
    }
    // Table (Simplified)
    if (line.startsWith('| ')) {
      const cols = line
        .split('|')
        .map(c => c.trim())
        .filter(c => c);
      if (line.includes('---')) continue;
      elements.push(
        <div
          key={i}
          className="grid grid-cols-4 gap-4 p-3 border-b border-white/5 hover:bg-white/5 transition-all text-xs"
        >
          {cols.map((col, ci) => (
            <span
              key={ci}
              className={ci === 0 ? 'font-bold text-[#d6b85c]' : 'text-slate-400'}
            >
              {parseInline(col)}
            </span>
          ))}
        </div>
      );
      continue;
    }
    // Standard Paragraph
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-4" />);
      continue;
    }

    elements.push(
      <p key={i} className="text-sm leading-relaxed text-slate-400 mb-4">
        {parseInline(line)}
      </p>
    );
  }
  return elements;
}
