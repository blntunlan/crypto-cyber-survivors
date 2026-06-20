import React, { useEffect, useReducer, useState } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
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

interface DocScreenState {
  navigation: { sidebar: DocSection[] } | null;
  selectedDoc: string;
  content: string;
  loading: boolean;
  searchQuery: string;
}

type DocScreenAction =
  | { type: 'setNavigation'; navigation: { sidebar: DocSection[] } }
  | { type: 'setSelectedDoc'; selectedDoc: string }
  | { type: 'setSearchQuery'; searchQuery: string }
  | { type: 'startLoading' }
  | { type: 'loadSuccess'; content: string }
  | { type: 'loadFailure'; selectedDoc: string };

const INITIAL_DOC_SCREEN_STATE: DocScreenState = {
  navigation: null,
  selectedDoc: '/docs/SYSTEM_OVERVIEW',
  content: 'LOADING DOCUMENT...',
  loading: false,
  searchQuery: '',
};

function docScreenReducer(
  state: DocScreenState,
  action: DocScreenAction
): DocScreenState {
  switch (action.type) {
    case 'setNavigation':
      return { ...state, navigation: action.navigation };
    case 'setSelectedDoc':
      return { ...state, selectedDoc: action.selectedDoc };
    case 'setSearchQuery':
      return { ...state, searchQuery: action.searchQuery };
    case 'startLoading':
      return { ...state, loading: true };
    case 'loadSuccess':
      return { ...state, content: action.content, loading: false };
    case 'loadFailure':
      return {
        ...state,
        content: `# DOCUMENT NOT FOUND\n\nPath: ${action.selectedDoc}\n\nThis protocol documentation is being decrypted and will be available soon.`,
        loading: false,
      };
    default:
      return state;
  }
}

function normalizeSelectedDocLink(link: string): string {
  if (link === 'README' || link === '/README') {
    return '/README';
  }

  let target = link;
  if (!target.startsWith('/')) {
    target = `/${target}`;
  }

  return target.replace(/\.md$/i, '');
}

function toDocPath(selectedDoc: string): string {
  const pathWithSlash = selectedDoc.startsWith('/') ? selectedDoc : `/${selectedDoc}`;
  return pathWithSlash.endsWith('.md') ? pathWithSlash : `${pathWithSlash}.md`;
}

async function fetchDocNavigation(): Promise<{ sidebar: DocSection[] }> {
  const response = await fetch('/docs/navigation.json');
  if (!response.ok) {
    throw new Error('Failed to load navigation');
  }
  return (await response.json()) as { sidebar: DocSection[] };
}

async function fetchDocContent(docPath: string): Promise<string> {
  const response = await fetch(docPath);
  if (!response.ok) {
    throw new Error('Document not found');
  }
  return response.text();
}

async function copyTextToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function renderCodeBlock(key: string, code: string, language?: string) {
  return (
    <div key={key} className="group relative my-6">
      <div className="absolute -top-3 left-4 z-10 bg-[#b22222] px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
        {language ?? 'TERMINAL'}
      </div>
      <pre className="custom-scrollbar overflow-x-auto rounded-sm border border-[#b22222]/20 bg-black p-6 shadow-2xl">
        <code className="block font-mono text-xs leading-relaxed text-slate-300">
          {code}
        </code>
      </pre>
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(code);
          }}
          className="rounded-sm bg-white/5 p-2 text-[10px] font-black uppercase text-slate-500 transition-all hover:bg-white/10 hover:text-white"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

interface DocContentRendererProps {
  content: string;
  onLinkClick: (link: string) => void;
}

const DocContentRenderer: React.FC<DocContentRendererProps> = ({
  content,
  onLinkClick,
}) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentCodeBlock: string[] | null = null;
  let codeLanguage = '';
  let keyCounter = 0;

  const nextKey = (prefix: string) => `${prefix}-${keyCounter++}`;

  const cleanLink = (url: string) => {
    return url.replace(/^\//, '').replace(/\.md$/, '');
  };

  const parseInline = (text: string) => {
    const parts: (string | React.JSX.Element)[] = [];
    let lastIndex = 0;
    const combinedRegex = /(\*\*.*?\*\*|\[.*?\]\(.*?\)|:([A-Z][a-zA-Z]+):)/g;
    let match: RegExpExecArray | null;

    while ((match = combinedRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const raw = match[0];
      if (!raw) {
        lastIndex = combinedRegex.lastIndex;
        continue;
      }

      if (raw.startsWith('**')) {
        parts.push(
          <span key={nextKey('inline-bold')} className="font-bold text-slate-200">
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
              type="button"
              key={nextKey('inline-link')}
              onClick={() => {
                const target = cleanLink(url);
                if (target.startsWith('docs') || target === 'README') {
                  onLinkClick(target.startsWith('docs') ? `/${target}` : '/README');
                } else {
                  window.open(url, '_blank');
                }
              }}
              className="font-bold text-[#d6b85c] transition-all hover:underline"
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
              key={nextKey('inline-icon')}
              className="mx-1 inline-block h-4 w-4 align-text-bottom"
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

  for (const line of lines) {
    // Handle Code Blocks
    if (line.startsWith('```')) {
      if (currentCodeBlock === null) {
        currentCodeBlock = [];
        codeLanguage = line.slice(3).trim();
      } else {
        elements.push(
          renderCodeBlock(
            nextKey('code-block'),
            currentCodeBlock.join('\n'),
            codeLanguage
          )
        );
        currentCodeBlock = null;
        codeLanguage = '';
      }
      continue;
    }

    if (currentCodeBlock !== null) {
      currentCodeBlock.push(line);
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1
          key={nextKey('header-1')}
          className="mb-12 border-b-2 border-[#b22222] pb-6 font-display text-4xl font-black uppercase italic tracking-tighter text-white md:text-6xl"
        >
          {parseInline(line.replace('# ', ''))}
        </h1>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={nextKey('header-2')}
          className="mb-6 mt-16 flex items-center gap-3 font-display text-xl font-black uppercase tracking-wider text-[#d6b85c] md:text-2xl"
        >
          <ChevronRight className="h-5 w-5" />
          {parseInline(line.replace('## ', ''))}
        </h2>
      );
      continue;
    }

    if (line.startsWith('> [!IMPORTANT]')) {
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteText = line.replace('> ', '');
      if (quoteText.includes('**Status**')) {
        elements.push(
          <div
            key={nextKey('status-box')}
            className="mb-8 flex items-center gap-4 border-l-4 border-[#b22222] bg-[#b22222]/10 p-4"
          >
            <IconShield className="h-6 w-6" color="#b22222" />
            <div className="font-mono text-xs uppercase tracking-widest text-[#b22222]">
              {parseInline(quoteText)}
            </div>
          </div>
        );
      } else {
        elements.push(
          <blockquote
            key={nextKey('blockquote')}
            className="mb-4 border-l-2 border-slate-700 py-1 pl-4 italic text-slate-500"
          >
            {parseInline(quoteText)}
          </blockquote>
        );
      }
      continue;
    }

    if (line.startsWith('- ')) {
      const cleanLine = line.replace('- ', '');
      elements.push(
        <div key={nextKey('list-item')} className="group mb-2 flex gap-3">
          <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 bg-[#d6b85c]/40 transition-colors group-hover:bg-[#d6b85c]" />
          <div className="text-sm leading-relaxed text-slate-400">
            {parseInline(cleanLine)}
          </div>
        </div>
      );
      continue;
    }

    if (line.startsWith('| ')) {
      const cols = line
        .split('|')
        .map(column => column.trim())
        .filter(column => column.length > 0);

      if (line.includes('---')) {
        continue;
      }

      const cells: React.ReactNode[] = [];
      const occurrenceByValue = new Map<string, number>();
      let isFirstColumn = true;

      for (const col of cols) {
        const currentCount = (occurrenceByValue.get(col) ?? 0) + 1;
        occurrenceByValue.set(col, currentCount);

        cells.push(
          <span
            key={`col-${col}-${currentCount}`}
            className={isFirstColumn ? 'font-bold text-[#d6b85c]' : 'text-slate-400'}
          >
            {parseInline(col)}
          </span>
        );

        isFirstColumn = false;
      }

      elements.push(
        <div
          key={nextKey('table-row')}
          className="grid grid-cols-4 gap-4 border-b border-white/5 p-3 text-xs transition-all hover:bg-white/5"
        >
          {cells}
        </div>
      );
      continue;
    }

    if (line.trim() === '') {
      elements.push(<div key={nextKey('spacer')} className="h-4" />);
      continue;
    }

    elements.push(
      <p
        key={nextKey('paragraph')}
        className="mb-4 text-sm leading-relaxed text-slate-400"
      >
        {parseInline(line)}
      </p>
    );
  }

  return <>{elements}</>;
};

export const DocScreen: React.FC<DocScreenProps> = ({ onClose }) => {
  const [state, dispatch] = useReducer(docScreenReducer, INITIAL_DOC_SCREEN_STATE);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const { navigation, selectedDoc, content, loading, searchQuery } = state;

  useEffect(() => {
    let isCancelled = false;

    const loadNavigation = async () => {
      try {
        const data = await fetchDocNavigation();
        if (!isCancelled) {
          dispatch({ type: 'setNavigation', navigation: data });
        }
      } catch (err) {
        console.error('Failed to load navigation:', err);
      }
    };

    void loadNavigation();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    dispatch({ type: 'startLoading' });
    let isCancelled = false;
    const docPath = toDocPath(selectedDoc);

    const loadDoc = async () => {
      try {
        const text = await fetchDocContent(docPath);
        if (!isCancelled) {
          dispatch({ type: 'loadSuccess', content: text });
        }
      } catch (err) {
        console.error('Failed to load doc:', err);
        if (!isCancelled) {
          dispatch({ type: 'loadFailure', selectedDoc });
        }
      }
    };

    void loadDoc();

    return () => {
      isCancelled = true;
    };
  }, [selectedDoc]);

  const handleDocSelect = (link: string) => {
    dispatch({ type: 'setSelectedDoc', selectedDoc: normalizeSelectedDocLink(link) });
    setShareStatus('idle');
  };

  const handleShareDoc = async () => {
    const shareUrl = new URL(window.location.href);
    shareUrl.hash = selectedDoc.replace(/^\//, '');

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: `Crypto Survivors Docs · ${selectedDoc}`,
          url: shareUrl.toString(),
        });
      } else {
        await copyTextToClipboard(shareUrl.toString());
      }
      setShareStatus('copied');
    } catch {
      setShareStatus('failed');
    }
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleSections = (navigation?.sidebar ?? [])
    .map(section => {
      if (!normalizedSearchQuery) {
        return section;
      }

      if (section.text.toLowerCase().includes(normalizedSearchQuery)) {
        return section;
      }

      const matchedItems = section.items.filter(item => {
        return (
          item.text.toLowerCase().includes(normalizedSearchQuery) ||
          item.link.toLowerCase().includes(normalizedSearchQuery)
        );
      });

      return {
        ...section,
        items: matchedItems,
      };
    })
    .filter(section => section.items.length > 0);

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[3300] flex flex-col overflow-hidden border-t-2 border-[#b22222]/50 bg-[#020617] font-mono text-slate-300 shadow-[0_-10px_50px_rgba(178,34,34,0.2)] md:flex-row"
      >
        {/* Sidebar - Navigation */}
        <div className="flex w-full flex-col border-r border-[#b22222]/20 bg-black/40 backdrop-blur-xl md:w-80">
          <div className="flex items-center justify-between border-b border-[#b22222]/20 p-6">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-[#d6b85c]" />
              <span className="font-display font-black tracking-tighter text-white">
                DOCS_V2.0
              </span>
            </div>
            <button
              type="button"
              aria-label="Close documentation"
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-white/5 md:hidden"
            >
              <Power className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                aria-label="Search documentation"
                placeholder="Search Protocol..."
                className="w-full rounded-sm border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-[#d6b85c]"
                value={searchQuery}
                onChange={event => {
                  dispatch({ type: 'setSearchQuery', searchQuery: event.target.value });
                }}
              />
            </div>
          </div>

          <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-6">
            {visibleSections.map(section => (
              <div key={`section-${section.text}`} className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b22222] opacity-80">
                  {section.text}
                </h3>
                <div className="space-y-1">
                  {section.items.map(item => {
                    const normalizedItemDoc = normalizeSelectedDocLink(item.link);
                    const isSelected = selectedDoc === normalizedItemDoc;

                    return (
                      <button
                        type="button"
                        key={`item-${section.text}-${item.link}`}
                        onClick={() => handleDocSelect(item.link)}
                        className={`group flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-xs transition-all
                          ${
                            isSelected
                              ? 'border-l-2 border-[#d6b85c] bg-[#d6b85c]/10 text-white'
                              : 'text-slate-500 hover:bg-white/5 hover:text-slate-100'
                          }`}
                      >
                        <span>{item.text}</span>
                        {isSelected && (
                          <ChevronRight className="h-3 w-3 text-[#d6b85c]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-[#b22222]/20 bg-black/20 p-6 text-[10px]">
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
        <div className="relative flex flex-1 flex-col bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed opacity-[0.98]">
          {/* Header toolbar */}
          <div className="flex h-16 items-center justify-between border-b border-[#b22222]/20 bg-black/20 px-8 backdrop-blur-md">
            <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-widest text-[#d6b85c]">
              <Terminal className="h-4 w-4" />
              <span>{selectedDoc}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Share documentation"
                onClick={() => void handleShareDoc()}
                className="group rounded-sm p-2 transition-colors hover:bg-white/5"
              >
                <Share2 className="h-4 w-4 text-slate-500 group-hover:text-white" />
              </button>
              {shareStatus !== 'idle' && (
                <span
                  className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                    shareStatus === 'copied' ? 'text-green-500' : 'text-red-400'
                  }`}
                >
                  {shareStatus === 'copied' ? 'Link Copied' : 'Share Failed'}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 border border-[#b22222]/30 bg-[#b22222]/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#b22222] transition-all hover:bg-[#b22222]/40"
              >
                <Power className="h-4 w-4" />
                EXIT_TERMINAL
              </button>
            </div>
          </div>

          {/* Markdown Renderer Area */}
          <div className="custom-scrollbar flex-1 overflow-y-auto scroll-smooth p-8 md:p-16">
            <AnimatePresence mode="wait">
              {loading ? (
                <m.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full flex-col items-center justify-center space-y-4"
                >
                  <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-800 border-t-[#d6b85c]" />
                  <span className="text-xs uppercase tracking-widest text-slate-500">
                    Decrypting Protocol Content...
                  </span>
                </m.div>
              ) : (
                <m.div
                  key={selectedDoc}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mx-auto max-w-4xl space-y-8 pb-32"
                >
                  <DocContentRenderer content={content} onLinkClick={handleDocSelect} />
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scrabble/Scanline Overlays */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-[#d6b85c]/10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-[#b22222]/10" />
        </div>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background:rgba(0,0,0,0.1); }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #b2222250; border-radius: 2px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #b2222290; }

          .font-display { font-family: 'Orbitron', sans-serif; }
        `}</style>
      </m.div>
    </LazyMotion>
  );
};
