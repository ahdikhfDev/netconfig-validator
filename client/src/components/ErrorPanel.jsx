const SEVERITY_COLORS = {
  error: { bg: 'bg-red-900/30', text: 'text-red-400', dot: 'bg-red-500' },
  warning: { bg: 'bg-amber-900/30', text: 'text-amber-400', dot: 'bg-amber-500' },
  info: { bg: 'bg-blue-900/30', text: 'text-blue-400', dot: 'bg-blue-500' },
};

const ROUTING_LABELS = {
  'RULE-08': { label: 'OSPF', cls: 'text-blue-400 bg-blue-900/40' },
  'RULE-09': { label: 'BGP', cls: 'text-purple-400 bg-purple-900/40' },
  'RULE-10': { label: 'MPLS', cls: 'text-emerald-400 bg-emerald-900/40' },
  'RULE-11': { label: 'VPLS', cls: 'text-amber-400 bg-amber-900/40' },
};

export default function ErrorPanel({ errors, summary, onErrorClick, selectedError }) {
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
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Issues</h2>
        <div className="flex gap-3 text-xs text-slate-500">
          <span className="text-red-400">{summary?.errorCount || 0} errors</span>
          <span className="text-amber-400">{summary?.warningCount || 0} warnings</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {errors.map((err) => {
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
                  {err.relatedDeviceIds.length > 0 && (
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
    </div>
  );
}
