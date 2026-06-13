import { useMemo, useEffect } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  ReactFlow,
  useNodesState,
  useEdgesState,
  getSmoothStepPath,
  EdgeLabelRenderer,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

// ─── Theme ───────────────────────────────────────────
const COLORS = {
  error:  '#ef4444',
  warn:   '#f59e0b',
  ok:     '#22c55e',
  linkOk: '#94a3b8',   // brighter for dark bg
  bg:     '#0f172a',
  card:   '#1e293b',
  text:   '#e2e8f0',
  dim:    '#64748b',
};

// Vibrant palette — each cable gets unique hue
const CABLE_PALETTE = [
  '#60a5fa', '#34d399', '#fbbf24', '#c084fc', '#fb923c',
  '#f472b6', '#22d3ee', '#a78bfa', '#facc15', '#4ade80',
  '#2dd4bf', '#e879f9', '#38bdf8', '#86efac', '#fdba74',
  '#d8b4fe', '#67e8f9', '#bef264', '#6ee7b7', '#f0abfc',
];

const PROTOCOL_COLORS = {
  ospf: { bg: '#1e3a5f', text: '#60a5fa' },
  bgp:  { bg: '#3b1f3b', text: '#c084fc' },
  mpls: { bg: '#1f3b2f', text: '#34d399' },
  vpls: { bg: '#3b2f1f', text: '#fbbf24' },
};

const VENDOR_STYLE = {
  routeros: { headBg: '#1e3a5f', accent: '#60a5fa', border: '#3b82f6', label: 'RouterOS' },
  linux:    { headBg: '#1a3a2a', accent: '#34d399', border: '#22c55e', label: 'Linux' },
};

// ─── SVG Device Icons (Cisco-style) ──────────────────
function RouterIcon({ color = '#60a5fa' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="1.5" y="3.5" width="21" height="17" rx="5" stroke={color} strokeWidth="1.5" fill="rgba(15,23,42,0.5)"/>
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" fill="none"/>
      <path d="M12 3.5v2M12 18.5v2M1.5 12h3M19.5 12h3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 8l2 2M14 14l2 2M8 16l2-2M14 10l2-2" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

function SwitchIcon({ color = '#34d399' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke={color} strokeWidth="1.5" fill="rgba(15,23,42,0.5)"/>
      <circle cx="5.5" cy="9" r="1.2" fill={color} opacity="0.8"/>
      <circle cx="9" cy="9" r="1.2" fill={color} opacity="0.8"/>
      <circle cx="12.5" cy="9" r="1.2" fill={color} opacity="0.8"/>
      <circle cx="16" cy="9" r="1.2" fill={color} opacity="0.8"/>
      <circle cx="19.5" cy="9" r="1.2" fill={color} opacity="0.8"/>
      <circle cx="5.5" cy="15" r="1.2" fill={color} opacity="0.35"/>
      <circle cx="9" cy="15" r="1.2" fill={color} opacity="0.35"/>
      <circle cx="12.5" cy="15" r="1.2" fill={color} opacity="0.35"/>
      <circle cx="16" cy="15" r="1.2" fill={color} opacity="0.35"/>
      <circle cx="19.5" cy="15" r="1.2" fill={color} opacity="0.35"/>
    </svg>
  );
}

function HostIcon({ color = '#fbbf24' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="3" width="14" height="11" rx="2" stroke={color} strokeWidth="1.5" fill="rgba(15,23,42,0.5)"/>
      <line x1="8" y1="6.5" x2="16" y2="6.5" stroke={color} strokeWidth="1" opacity="0.5"/>
      <line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth="1" opacity="0.5"/>
      <line x1="8" y1="11.5" x2="16" y2="11.5" stroke={color} strokeWidth="1" opacity="0.5"/>
      <rect x="10" y="14" width="4" height="3" rx="0.5" stroke={color} strokeWidth="1" fill="rgba(15,23,42,0.5)"/>
      <rect x="8" y="17" width="8" height="2" rx="1" stroke={color} strokeWidth="1" fill="rgba(15,23,42,0.5)"/>
    </svg>
  );
}

function getDeviceSvgIcon(vendorType) {
  if (vendorType === 'routeros') return <RouterIcon />;
  if (vendorType === 'linux') return <HostIcon />;
  return <SwitchIcon color="#64748b" />;
}

// ─── Helpers ─────────────────────────────────────────
function dagreLayout(nodes, edges, direction = 'TB') {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120, marginx: 40, marginy: 40 });

  nodes.forEach((n) => g.setNode(n.id, { width: 150, height: 90 }));
  edges.forEach((e) => {
    if (e.source !== e.target) g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 75, y: pos.y - 45 } };
  });
}

function parseIfaceId(id) {
  if (!id) return { name: '—', ip: '' };
  const idx = id.lastIndexOf('-');
  if (idx === -1) return { name: id, ip: '' };
  return { name: id.slice(0, idx), ip: id.slice(idx + 1) };
}

/** Pick edge color: error > protocol-derived > cable-unique */
function edgeColor(hasError, link, deviceProtocols, index) {
  if (hasError) return COLORS.error;
  if (link.status === 'warn') return COLORS.warn;

  // Derive protocol color from shared device protocols
  const srcP = deviceProtocols[link.deviceAId] || [];
  const dstP = deviceProtocols[link.deviceBId] || [];
  for (const p of srcP) {
    if (dstP.includes(p) && PROTOCOL_COLORS[p]) {
      return PROTOCOL_COLORS[p].text;
    }
  }
  return CABLE_PALETTE[index % CABLE_PALETTE.length];
}

// ─── Custom Edge ─────────────────────────────────────
// ReactFlow 11.x: path coords as direct props (not data.__rfProps)
// smoothstep = cleaner network-diagram style, no bezier curves
function NetEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data = {}, markerEnd }) {
  const color = data?.color || COLORS.linkOk;
  const sw = data?.hasError ? 4 : 3;  // thicker for better visibility
  const hasError = data?.hasError;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
  });

  return (
    <>
      {/* Glow layer */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={sw + 4}
        strokeLinecap="round"
        opacity={0.12}
        style={{ pointerEvents: 'none' }}
      />
      {/* Main cable */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={data?.dash || 'none'}
        markerEnd={markerEnd}
        className={hasError ? 'animate-pulse' : ''}
      />
      {/* Subnet label */}
      {data?.subnet && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              left: labelX,
              top: labelY,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              background: '#0f172a',
              border: `1px solid ${color}66`,
              borderRadius: 4,
              padding: '2px 7px',
              fontSize: 10,
              color: '#94a3b8',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
              boxShadow: `0 0 8px ${color}33`,
              zIndex: 10,
            }}
          >
            {data.subnet}
          </div>
        </EdgeLabelRenderer>
      )}
      {/* Protocol badge */}
      {data?.protoLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              left: labelX,
              top: labelY + 18,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              background: '#1e293b',
              border: `1px solid ${color}`,
              borderRadius: 3,
              padding: '1px 6px',
              fontSize: 9,
              fontWeight: 700,
              color,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              zIndex: 10,
            }}
          >
            {data.protoLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// ─── Dangling Edge (underpopulated link stub) ────────
// Renders a dashed stub extending from source node toward an unknown destination.
// Shows subnet + "?" label so users know the link exists but has no peer device.
function DanglingEdge({ id, sourceX, sourceY, sourcePosition, data = {}, markerEnd }) {
  const STUB_LEN = 140;
  const color = data?.color || '#f59e0b'; // amber = "unknown/warning"

  // Extend stub to the RIGHT from the source edge point
  const targetX = sourceX + STUB_LEN;
  const targetY = sourceY;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY,
    targetPosition: 'left',   // points back toward source
    borderRadius: 10,
  });

  return (
    <>
      {/* Glow */}
      <path d={edgePath} fill="none" stroke={color} strokeWidth={6}
        strokeLinecap="round" opacity={0.1} style={{ pointerEvents: 'none' }} />
      {/* Dashed stub line */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="7,5"
        markerEnd={markerEnd}
      />
      {/* Subnet + "?" badge */}
      {data?.subnet && (
        <EdgeLabelRenderer>
          <div style={{
            position: 'absolute',
            left: (sourceX + targetX) / 2,
            top: labelY,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            background: '#0f172a',
            border: `1px dashed ${color}`,
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 10,
            color: '#94a3b8',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            boxShadow: `0 0 8px ${color}33`,
            zIndex: 10,
          }}>
            {data.subnet}
          </div>
        </EdgeLabelRenderer>
      )}
      {/* "?" label at end */}
      <EdgeLabelRenderer>
        <div style={{
          position: 'absolute',
          left: targetX,
          top: targetY,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          background: '#0f172a',
          border: `1.5px dashed ${color}`,
          borderRadius: 8,
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
          color,
          zIndex: 10,
          boxShadow: `0 0 10px ${color}44`,
        }}>
          ?
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { netEdge: NetEdge, danglingEdge: DanglingEdge };

// ─── Custom Node ─────────────────────────────────────
function NetNode({ data }) {
  const vs = VENDOR_STYLE[data.vendorType] || VENDOR_STYLE.routeros;
  const isRouter = data.vendorType === 'routeros';
  const radius = isRouter ? 12 : 8;

  return (
    <div
      className="net-node"
      style={{
        background: data.hasError ? '#2d0f0f' : COLORS.card,
        border: `2px solid ${data.hasError ? COLORS.error : vs.border}`,
        borderRadius: radius,
        padding: 0,
        minWidth: 150,
        overflow: 'hidden',
        boxShadow: data.hasError
          ? `0 0 12px ${COLORS.error}66`
          : `0 2px 8px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.03)`,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!data.hasError) e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.5), inset 0 0 0 1px ${vs.accent}33`;
      }}
      onMouseLeave={(e) => {
        if (!data.hasError) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      }}
    >
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px 4px',
        background: data.hasError ? '#3f1515' : vs.headBg,
        borderBottom: `1px solid ${data.hasError ? COLORS.error : vs.border}`,
      }}>
        {/* SVG icon */}
        <span style={{ display: 'flex', flexShrink: 0 }}>
          {getDeviceSvgIcon(data.vendorType)}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: '-0.2px',
            lineHeight: 1.2,
          }}>
            {data.label}
          </span>
          <span style={{ fontSize: 8, color: vs.accent, lineHeight: 1.2, opacity: 0.7 }}>
            {vs.label}
          </span>
        </div>
        {data.loopback && (
          <span style={{ fontSize: 8, color: COLORS.dim, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            lo:{data.loopback}
          </span>
        )}
      </div>

      {/* Interface list with port indicators */}
      {data.interfaces && data.interfaces.length > 0 && (
        <div style={{
          padding: '5px 10px 5px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          {data.interfaces.slice(0, 6).map((iface) => {
            const linked = data.linkedIfaces?.has(iface.name);
            return (
              <div key={iface.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 9,
                color: '#94a3b8',
              }}>
                {/* Port indicator dot */}
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: linked ? vs.accent : '#334155',
                  flexShrink: 0,
                  display: 'inline-block',
                }} />
                <span style={{ fontWeight: 600, color: '#cbd5e1', flexShrink: 0 }}>
                  {iface.name}
                </span>
                <span style={{ marginLeft: 'auto' }}>
                  {iface.ip}/{iface.prefixLength}
                </span>
              </div>
            );
          })}
          {data.interfaces.length > 6 && (
            <div style={{ fontSize: 8, color: COLORS.dim, textAlign: 'right' }}>
              +{data.interfaces.length - 6} more
            </div>
          )}
        </div>
      )}

      {/* Protocol badges */}
      {data.protocols && data.protocols.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 3,
          justifyContent: 'center',
          padding: '0 10px 6px',
          flexWrap: 'wrap',
        }}>
          {data.protocols.map((p) => {
            const c = PROTOCOL_COLORS[p.toLowerCase()] || { bg: '#374151', text: '#94a3b8' };
            return (
              <span key={p} style={{
                background: c.bg,
                color: c.text,
                fontSize: 8,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}>
                {p}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { netNode: NetNode };

// ─── Main Component ──────────────────────────────────
export default function TopologyGraph({ devices, links, errors, selectedError }) {
  const { fitView } = useReactFlow();

  // Build interface lookup: ifaceId -> { name, ip, prefix, deviceId }
  const ifaceMap = useMemo(() => {
    const map = {};
    for (const d of devices) {
      for (const iface of d.interfaces || []) {
        map[iface.id] = { ...iface, deviceId: d.id };
        map[`${d.id}/${iface.id}`] = iface;
        if (iface.id !== iface.name) {
          map[`${d.id}/${iface.name}`] = iface;
        }
      }
    }
    return map;
  }, [devices]);

  const selectedDeviceIds = useMemo(() => {
    if (!selectedError) return new Set();
    return new Set(selectedError.relatedDeviceIds || []);
  }, [selectedError]);

  const selectedLinkIds = useMemo(() => {
    if (!selectedError?.relatedLinkId) return new Set();
    return new Set([selectedError.relatedLinkId]);
  }, [selectedError]);

  // Protocol lookup per device for edge coloring
  const deviceProtocols = useMemo(() => {
    const map = {};
    for (const d of devices) {
      map[d.id] = d.protocols || [];
    }
    return map;
  }, [devices]);

  // Device name lookup
  const deviceNameMap = useMemo(() => {
    const map = {};
    for (const d of devices) {
      map[d.id] = d.name;
    }
    return map;
  }, [devices]);

  // Build set of linked interface names per device for port indicators
  const linkedIfacesByDevice = useMemo(() => {
    const map = {};
    for (const link of links) {
      if (link.interfaceBId) {
        if (!map[link.deviceAId]) map[link.deviceAId] = new Set();
        map[link.deviceAId].add(link.interfaceAId);
        if (!map[link.deviceBId]) map[link.deviceBId] = new Set();
        map[link.deviceBId].add(link.interfaceBId);
      } else {
        if (!map[link.deviceAId]) map[link.deviceAId] = new Set();
        map[link.deviceAId].add(link.interfaceAId);
      }
    }
    return map;
  }, [links]);

  // Build React Flow nodes
  const baseNodes = useMemo(() => {
    return devices.map((dev) => ({
      id: dev.id,
      type: 'netNode',
      data: {
        label: dev.name,
        vendorType: dev.vendorType,
        deviceType: VENDOR_STYLE[dev.vendorType]?.label || 'Device',
        loopback: dev.loopback,
        protocols: dev.protocols || [],
        interfaces: dev.interfaces || [],
        linkedIfaces: linkedIfacesByDevice[dev.id] || new Set(),
        hasError: selectedDeviceIds.has(dev.id),
      },
    }));
  }, [devices, selectedDeviceIds, linkedIfacesByDevice]);

  // Build React Flow edges — two groups:
  //   full links    → netEdge (normal cables)
  //   underpopulated → danglingEdge (dashed stubs with "?")
  const baseEdges = useMemo(() => {
    const fullLinks = links.filter((l) => l.deviceBId && l.interfaceBId);
    const danglingLinks = links.filter((l) => !l.deviceBId || !l.interfaceBId);

    const fullEdges = fullLinks.map((link, idx) => {
      const hasError = selectedLinkIds.has(link.id);
      const color = edgeColor(hasError, link, deviceProtocols, idx);
      const markerEnd = { type: MarkerType.ArrowClosed, color };

      let protoLabel = null;
      if (!hasError) {
        const srcP = deviceProtocols[link.deviceAId] || [];
        const dstP = deviceProtocols[link.deviceBId] || [];
        for (const p of srcP) {
          if (dstP.includes(p) && PROTOCOL_COLORS[p]) { protoLabel = p; break; }
        }
      }

      const rawA = ifaceMap[`${link.deviceAId}/${link.interfaceAId}`];
      const ifaceA = rawA ? { name: rawA.name, ip: rawA.ip } : parseIfaceId(link.interfaceAId);
      const rawB = ifaceMap[`${link.deviceBId}/${link.interfaceBId}`];
      const ifaceB = rawB ? { name: rawB.name, ip: rawB.ip } : parseIfaceId(link.interfaceBId);

      return {
        id: link.id,
        source: link.deviceAId,
        target: link.deviceBId,
        type: 'netEdge',
        animated: hasError,
        markerEnd,
        style: { stroke: color, strokeWidth: hasError ? 4 : 3 },
        data: {
          subnet: link.subnet,
          color,
          hasError,
          protoLabel,
          ifaceA,
          ifaceB,
          srcDevice: deviceNameMap[link.deviceAId] || link.deviceAId,
          tgtDevice: deviceNameMap[link.deviceBId] || link.deviceBId,
        },
      };
    });

    // Dangling edges: underpopulated links — dashed stubs with "?" label
    // Uses source==target in RF data model; DanglingEdge ignores target coords.
    const danglingEdges = danglingLinks.map((link) => {
      const markerEnd = { type: MarkerType.ArrowClosed, color: '#f59e0b' };
      return {
        id: link.id,
        source: link.deviceAId,
        target: link.deviceAId,
        type: 'danglingEdge',
        markerEnd,
        style: { stroke: '#f59e0b', strokeWidth: 2 },
        data: {
          subnet: link.subnet,
          color: '#f59e0b',
          srcDevice: deviceNameMap[link.deviceAId] || link.deviceAId,
          interfaceAId: link.interfaceAId,
        },
      };
    });

    return [...fullEdges, ...danglingEdges];
  }, [links, selectedLinkIds, ifaceMap, deviceProtocols, deviceNameMap]);

  // dagre layout — compute BEFORE initializing React Flow state
  const laidOutNodes = useMemo(() => dagreLayout(baseNodes, baseEdges), [baseNodes, baseEdges]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(laidOutNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(baseEdges);

  // Sync state when upstream data changes (useNodesState/useEdgesState only
  // use initial value once — subsequent prop changes need explicit sync)
  useEffect(() => {
    setFlowNodes(laidOutNodes);
  }, [laidOutNodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(baseEdges);
  }, [baseEdges, setFlowEdges]);

  // Fit view after nodes ready
  useEffect(() => {
    fitView({ padding: 0.2 });
  }, [laidOutNodes, fitView]);

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      attributionPosition="bottom-left"
      style={{ background: COLORS.bg }}
      minZoom={0.3}
      maxZoom={2.5}
      panOnDrag={[1, 2]}
      selectNodesOnDrag={false}
    >
      <Background color="#1e293b" gap={20} />
      <Controls className="!bg-slate-800/90 !border-slate-700 [&_button]:!text-slate-300 [&_button]:hover:!bg-slate-700" />
      <MiniMap
        nodeColor={(n) => {
          if (n.data?.hasError) return '#ef444488';
          const vs = VENDOR_STYLE[n.data?.vendorType] || VENDOR_STYLE.routeros;
          return vs.accent + '44';
        }}
        maskColor="rgba(15, 23, 42, 0.75)"
        className="!bg-slate-800/90 !border !border-slate-700"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}
