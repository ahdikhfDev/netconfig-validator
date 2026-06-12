import { useState, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import ConfigInput from './components/ConfigInput';
import TopologyGraph from './components/TopologyGraph';
import ErrorPanel from './components/ErrorPanel';
import ExportButton from './components/ExportButton';
import { validateConfig } from './api/validate';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedError, setSelectedError] = useState(null);

  const handleValidate = useCallback(async (rawConfig) => {
    setLoading(true);
    setError(null);
    setSelectedError(null);
    try {
      const result = await validateConfig(rawConfig);
      setData(result);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleErrorClick = useCallback((err) => {
    setSelectedError(err);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌐</span>
          <h1 className="text-lg font-bold text-slate-100">NetSim Lite</h1>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">v0.1</span>
        </div>
        {data && <ExportButton errors={data.errors} devices={data.devices} />}
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Input */}
        <div className="w-[420px] min-w-[320px] border-r border-slate-800 flex flex-col">
          <ConfigInput onValidate={handleValidate} loading={loading} />
        </div>

        {/* Center: Graph */}
        <div className="flex-1 relative">
          {data ? (
            <ReactFlowProvider>
              <TopologyGraph
                devices={data.devices}
                links={data.links}
                errors={data.errors}
                selectedError={selectedError}
              />
            </ReactFlowProvider>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600">
              <div className="text-center space-y-2">
                <p className="text-4xl">🌐</p>
                <p className="text-sm">Paste config &amp; click Validate</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Errors */}
        <div className="w-[380px] min-w-[300px] border-l border-slate-800 flex flex-col">
          {data ? (
            <ErrorPanel
              errors={data.errors}
              summary={data.summary}
              onErrorClick={handleErrorClick}
              selectedError={selectedError}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-700 text-sm">
              No results yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
