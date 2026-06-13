import { useState, useMemo } from 'react';

const SEVERITY_COLORS = {
  error: { bg: 'bg-red-900/30', text: 'text-red-400', dot: 'bg-red-500', label: 'Error' },
  warning: { bg: 'bg-amber-900/30', text: 'text-amber-400', dot: 'bg-amber-500', label: 'Warning' },
  info: { bg: 'bg-blue-900/30', text: 'text-blue-400', dot: 'bg-blue-500', label: 'Info' },
};

const ROUTING_LABELS = {
  'RULE-08': { label: 'OSPF', cls: 'text-blue-400 bg-blue-900/40' },
  'RULE-09': { label: 'BGP', cls: 'text-purple-400 bg-purple-900/40' },
  'RULE-10': { label: 'MPLS', cls: 'text-emerald-400 bg-emerald-900/40' },
  'RULE-11': { label: 'VPLS', cls: 'text-amber-400 bg-amber-900/40' },
};

function formatErrorText(errors) {
  return errors.map(e =>
    `[${e.severity.toUpperCase()}] ${e.ruleCode}: ${e.message}` +
    (e.relatedDeviceIds?.length ? `\n  Devices: ${e.relatedDeviceIds.join(', ')}` : '') +
    (e.relatedLinkId ? `\n  Link: ${e.relatedLinkId}` : '')
  ).join('\n\n');
}

export default function ErrorPanel({ errors, summary, onErrorClick, selectedError }) {
  const [filter, setFilter] = useState('all');
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const counts = useMemo(() => {
    const c = { all: errors?.length || 0, error: 0, warning: 0, info: 0 };
    if (errors) for (const e of errors) if (c[e.severity] !== undefined) c[e.severity]++;
    return c;
  }, [errors]);

  const filteredErrors = useMemo(() => {
    if (!errors) return [];
    if (filter === 'all') return errors;
    return errors.filter((e) => e.severity === filter);
  }, [errors, filter]);

  const FILTER_ITEMS = [
    { key: 'all', label: 'All' },
    { key: 'error', label: 'Errors', color: 'text-red-400' },
    { key: 'warning', label: 'Warnings', color: 'text-amber-400' },
    { key: 'info', label: 'Info', color: 'text-blue-400' },
  ];

  const handleCopy = () => {
    if (!errors?.length) return;
    const text = formatErrorText(errors);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (!errors || errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600">
        <span className="text-3xl mb-2">✅</span>
        <p className="text-sm">No issues found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with collapse + copy */}
      <div className="px-4 py-2.5 border-b border-slate-700/60 flex items-center justify-between shrink-0 bg-slate-800/40">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Issues
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 text-[11px]">
            <span className="text-red-400">{summary?.errorCount || 0} err</span>
            <span className="text-amber-400">{summary?.warningCount || 0} warn</span>
          </div>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="text-slate-500 hover:text-slate-200 p-1 rounded transition-colors"
            title="Copy all issues"
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
          {/* Collapse toggle */}
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
      </div>

      {!collapsed && (
        <>
          {/* Severity filter tabs */}
          <div className="px-4 py-1.5 border-b border-slate-800/50 flex gap-1 shrink-0">
            {FILTER_ITEMS.map((item) => {
              const active = filter === item.key;
              const count = counts[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded transition-colors ${
                    active
                      ? item.key === 'all'
                        ? 'bg-slate-700 text-white'
                        : `${item.color} bg-slate-700/80`
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  {item.label}
                  {count > 0 && (
                    <span className={`ml-1 ${active ? 'opacity-80' : 'opacity-50'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Error list */}
          <div className="flex-1 overflow-y-auto">
            {filteredErrors.map((err) => {
              const sev = SEVERITY_COLORS[err.severity] || SEVERITY_COLORS.info;
              const isSelected = selectedError?.id === err.id;
              const routingLabel = ROUTING_LABELS[err.ruleCode];

              return (
                <button
                  key={err.id}
                  onClick={() => onErrorClick(err)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${
                    isSelected ? 'bg-slate-800' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${sev.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={`text-xs font-mono font-bold ${sev.text}`}>{err.ruleCode}</span>
                        <span className={`text-[10px] uppercase ${sev.text}`}>{err.severity}</span>
                        {routingLabel && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${routingLabel.cls}`}>
                            {routingLabel.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{err.message}</p>
                      {err.relatedDeviceIds?.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Devices: {err.relatedDeviceIds.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}