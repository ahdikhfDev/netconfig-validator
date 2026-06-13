import { useState } from 'react';

export default function ConfigInput({ onValidate }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      await onValidate(input);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadExample = () => {
    setInput(
`# MikroTik config
/interface bridge add name=loopback protocol-mode=none
/ip address add address=192.168.1.1/24 interface=loopback`
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/60 shrink-0 bg-slate-800/40">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Config Input</span>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          )}
        </button>
      </div>

      {!collapsed && (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Paste MikroTik config here...\n\nOr click "Load Example" to try with sample config.`}
            className="flex-1 min-h-0 resize-none bg-slate-900 text-slate-200 text-xs font-mono p-3 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
            spellCheck={false}
          />
          <div className="flex gap-2 p-2 border-t border-slate-700/60 shrink-0">
            <button
              type="button"
              onClick={handleLoadExample}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-100 border border-slate-600 hover:border-slate-500 rounded transition-colors"
            >
              Load Example
            </button>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex-1 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 rounded transition-colors"
            >
              {loading ? 'Parsing…' : 'Validate & Visualize'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}