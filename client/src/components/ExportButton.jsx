export default function ExportButton({ errors, devices }) {
  const handleExportMarkdown = () => {
    let md = `# NetSim Lite — Validation Report\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n`;
    md += `**Devices:** ${devices.length}\n\n`;

    // Device summary with protocols
    md += `## Devices\n\n`;
    md += `| Name | Type | Protocols | Loopback |\n`;
    md += `|------|------|-----------|----------|\n`;
    for (const dev of devices) {
      const prots = (dev.protocols || []).join(', ') || '—';
      const lo = dev.loopback || '—';
      md += `| ${dev.name} | ${dev.vendorType} | ${prots} | ${lo} |\n`;
    }
    md += '\n';

    if (errors.length === 0) {
      md += `✅ No issues found.\n`;
    } else {
      md += `## Issues (${errors.length})\n\n`;
      md += `| Rule | Severity | Message |\n`;
      md += `|------|----------|--------|\n`;
      for (const err of errors) {
        md += `| ${err.ruleCode} | ${err.severity} | ${err.message} |\n`;
      }
    }

    md += `\n---\n*NetSim Lite v0.1*\n`;
    download(md, 'netsim-report.md', 'text/markdown');
  };

  const handleExportTxt = () => {
    let txt = `NetSim Lite — Validation Report\n`;
    txt += `Generated: ${new Date().toISOString()}\n`;
    txt += `Devices: ${devices.length}\n`;
    txt += `${'='.repeat(50)}\n\n`;

    for (const dev of devices) {
      txt += `Device: ${dev.name} (${dev.vendorType})\n`;
      txt += `  Protocols: ${(dev.protocols || []).join(', ') || 'none'}\n`;
      txt += `  Loopback: ${dev.loopback || '—'}\n\n`;
    }

    txt += `${'='.repeat(50)}\n\n`;

    if (errors.length === 0) {
      txt += `No issues found.\n`;
    } else {
      for (const err of errors) {
        txt += `[${err.ruleCode}] (${err.severity.toUpperCase()})\n`;
        txt += `  ${err.message}\n\n`;
      }
    }

    download(txt, 'netsim-report.txt', 'text/plain');
  };

  function download(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExportMarkdown}
        className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
      >
        Export .md
      </button>
      <button
        onClick={handleExportTxt}
        className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
      >
        Export .txt
      </button>
    </div>
  );
}
