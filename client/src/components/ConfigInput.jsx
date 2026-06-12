import { useState } from 'react';

const PLACEHOLDER = `# 1. PE-2
/ip address add address=152.100.13.2/30 interface=ether2
/ip address add address=152.100.13.34/30 interface=ether3

# 2. PE-3
/ip address add address=152.100.13.2/30 interface=ether2
/ip address add address=152.100.13.66/30 interface=ether3

# 3. Host-A
auto eth0
iface eth0 inet static
  address 192.168.1.2/24
  gateway 192.168.1.1
`;

export default function ConfigInput({ onValidate, loading }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onValidate(text);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Config Input</h2>
        <span className="text-xs text-slate-600">{text.length} chars</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        className="flex-1 p-4 bg-slate-950 text-slate-200 text-sm font-mono resize-none outline-none placeholder:text-slate-700"
        spellCheck={false}
      />

      <div className="p-3 border-t border-slate-800">
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-sm font-semibold transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Validating...
            </span>
          ) : (
            'Validate Config'
          )}
        </button>
      </div>
    </form>
  );
}
