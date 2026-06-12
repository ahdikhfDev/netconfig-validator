import { Router } from 'express';
import { runPipeline } from '../pipeline/splitter.js';
import { parseRouterOS } from '../pipeline/parsers/routeros.js';
import { parseLinuxHost } from '../pipeline/parsers/linuxHost.js';
import { buildGraph } from '../pipeline/graphBuilder.js';
import { runAllRules } from '../pipeline/rules/index.js';
import { formatResponse } from '../pipeline/responseFormatter.js';

export const validateRouter = Router();

validateRouter.post('/validate', (req, res) => {
  try {
    const { rawConfig } = req.body;
    if (!rawConfig || typeof rawConfig !== 'string') {
      return res.status(400).json({ error: 'rawConfig (string) required' });
    }

    // 1. Split per device block
    const blocks = runPipeline(rawConfig);

    // 2. Parse each block
    const devices = blocks.map((block) => {
      const vendor = detectVendor(block.text);
      let parsed;
      if (vendor === 'routeros') parsed = parseRouterOS(block.text);
      else if (vendor === 'linux_host') parsed = parseLinuxHost(block.text);
      else parsed = { interfaces: [], parseWarnings: ['Unknown vendor type'] };

      return {
        id: block.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
        name: block.name,
        vendorType: vendor,
        rawConfig: block.text,
        interfaces: parsed.interfaces || [],
        parseWarnings: parsed.parseWarnings || [],
        loopback: parsed.loopback || null,
        routingConfig: parsed.routing || null,
        protocols: parsed.protocols || [],
      };
    });

    // 3. Build topology graph
    const links = buildGraph(devices);

    // 4. Run validation rules (Phase 1 + Phase 2 routing rules)
    const errors = runAllRules(devices, links);

    // 5. Format response
    const result = formatResponse(devices, links, errors);
    res.json(result);
  } catch (err) {
    console.error('Validation error:', err);
    res.status(500).json({ error: err.message });
  }
});

function detectVendor(text) {
  if (/^\/interface\b|^\/ip\b|^\/routing\b|^\/mpls\b|^\/system\b/m.test(text)) return 'routeros';
  if (/^auto\s|^iface\s|^source\s/m.test(text)) return 'linux_host';
  return 'unknown';
}
