import { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

const ERROR_COLOR = '#ef4444';
const WARN_COLOR = '#f59e0b';
const OK_COLOR = '#22c55e';

const PROTOCOL_COLORS = {
  ospf: { bg: '#1e3a5f', text: '#60a5fa' },
  bgp: { bg: '#3b1f3b', text: '#c084fc' },
  mpls: { bg: '#1f3b2f', text: '#34d399' },
  vpls: { bg: '#3b2f1f', text: '#fbbf24' },
};

// Custom node component
function DeviceNode({ data }) {
  return (
    <div
      className="device-node"
      style={{
        background: data.hasError ? '#3b0f0f' : '#1e293b',
        color: '#e2e8f0',
        border: `2px solid ${data.hasError ? ERROR_COLOR : '#334155'}`,
        borderRadius: 8,
        padding: '10px 16px 8px',
        fontSize: 12,
        fontWeight: 600,
        minWidth: 130,
        textAlign: 'center',
      }}
    >
      <div>{data.label}</div>
      {data.protocols && data.protocols.length > 0 && (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' }}>
          {data.protocols.map((p) => {
            const colors = PROTOCOL_COLORS[p.toLowerCase()] || { bg: '#374151', text: '#94a3b8' };
            return (
              <span
                key={p}
                style={{
                  background: colors.bg,
                  color: colors.text,
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 4,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                {p}
              </span>
            );
          })}
        </div>
      )}
      {data.loopback && (
        <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>lo: {data.loopback}</div>
      )}
    </div>
  );
}

const nodeTypes = { deviceNode: DeviceNode };

export default function TopologyGraph({ devices, links, errors, selectedError }) {
  const selectedDeviceIds = useMemo(() => {
    if (!selectedError) return new Set();
    return new Set(selectedError.relatedDeviceIds || []);
  }, [selectedError]);

  const selectedLinkSubnets = useMemo(() => {
    if (!selectedError?.relatedLinkId) return new Set();
    const link = links.find((l) => l.id === selectedError.relatedLinkId);
    return new Set(link ? [link.subnet] : []);
  }, [selectedError, links]);

  const nodes = useMemo(() => {
    return devices.map((dev, i) => {
      const hasError = selectedDeviceIds.has(dev.id);
      const angle = (2 * Math.PI * i) / devices.length;
      return {
        id: dev.id,
        type: 'deviceNode',
        position: {
          x: 400 + Math.cos(angle) * 250,
          y: 300 + Math.sin(angle) * 250,
        },
        data: {
          label: dev.name,
          vendorType: dev.vendorType,
          loopback: dev.loopback,
          protocols: dev.protocols || [],
          hasError,
        },
      };
    });
  }, [devices, selectedDeviceIds]);

  const edgeList = useMemo(() => {
    return links.map((link) => {
      const hasError = selectedLinkSubnets.has(link.subnet);
      const isComplete = link.interfaceBId;
      return {
        id: link.id,
        source: link.deviceAId,
        target: link.deviceBId || link.deviceAId,
        label: link.subnet,
        animated: hasError,
        style: {
          stroke: hasError ? ERROR_COLOR : link.status === 'valid' ? '#475569' : WARN_COLOR,
          strokeWidth: hasError ? 3 : 1.5,
          strokeDasharray: isComplete ? 'none' : '5 5',
        },
        markerEnd: isComplete ? { type: MarkerType.ArrowClosed, color: '#64748b' } : undefined,
        labelStyle: { fontSize: 10, fill: '#94a3b8' },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
      };
    });
  }, [links, selectedLinkSubnets]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edgeList);

  useMemo(() => {
    setFlowNodes(nodes);
    setFlowEdges(edgeList);
  }, [nodes, edgeList, setFlowNodes, setFlowEdges]);

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      attributionPosition="bottom-left"
      className="bg-slate-900"
    >
      <Background color="#1e293b" gap={20} />
      <Controls className="bg-slate-800 border-slate-700 [&_button]:text-slate-300" />
      <MiniMap
        nodeColor={(n) => n.data?.hasError ? '#3b0f0f' : '#1e293b'}
        maskColor="rgba(15, 23, 42, 0.7)"
        className="!bg-slate-800 border border-slate-700"
      />
    </ReactFlow>
  );
}
