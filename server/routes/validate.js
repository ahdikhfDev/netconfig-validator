import { Router } from 'express';
import { runPipeline } from '../pipeline/splitter.js';
import { parseConfig, detectVendor } from '../pipeline/parsers/index.js';
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

    // 2. Parse each block via vendor-abstracted parser registry
    const devices = blocks.map((block) => {
      const parsed = parseConfig(block.text);

      return {
        id: block.name
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, ''),
        name: block.name,
        vendorType: detectVendor(block.text),
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

    // 4. Run validation rules
    const errors = runAllRules(devices, links);

    // 5. Format response
    const result = formatResponse(devices, links, errors);
    res.json(result);
  } catch (err) {
    console.error('Validation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Legacy export for backward compatibility
validateRouter.post('/detect-vendor', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  res.json({ vendor: detectVendor(text) });
});