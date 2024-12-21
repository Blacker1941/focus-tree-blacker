import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import './css/app.css';

import { initialNodes } from './data';
import { TfiSave } from "react-icons/tfi";
import { LuArchiveRestore } from "react-icons/lu";

const initialEdges = [];

function Flow() {
  const storedNodes = JSON.parse(localStorage.getItem('nodes')) || initialNodes;
  const storedEdges = JSON.parse(localStorage.getItem('edges')) || initialEdges;

  const [nodes, setNodes] = useState(storedNodes);
  const [edges, setEdges] = useState(storedEdges);

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    description: '',
  });

  const [message, setMessage] = useState('');

  useEffect(() => {
    const updatedNodes = initialNodes.map((newNode) => {
      const existingNode = nodes.find((node) => node.id === newNode.id);

      const updatedData = { ...newNode.data };
      if (updatedData.label) {
        updatedData.label = updatedData.label.replace(/لوکاس هاست/g, 'ایندکس بی جی');
      }
      if (updatedData.description) {
        updatedData.description = updatedData.description.replace(/لوکاس هاست/g, 'ایندکس بی جی');
      }

      return existingNode
        ? { ...existingNode, data: { ...existingNode.data, ...updatedData } }
        : { ...newNode, data: updatedData };
    });

    const isNodesChanged = !updatedNodes.every((node, index) =>
      JSON.stringify(node) === JSON.stringify(nodes[index])
    );

    if (isNodesChanged) {
      setNodes(updatedNodes);
      localStorage.setItem('nodes', JSON.stringify(updatedNodes));
    }
  }, [initialNodes, nodes]);

  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);
        localStorage.setItem('nodes', JSON.stringify(updatedNodes));
        return updatedNodes;
      });
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const updatedEdges = applyEdgeChanges(changes, eds);
        localStorage.setItem('edges', JSON.stringify(updatedEdges));
        return updatedEdges;
      });
    },
    []
  );

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => {
        const updatedEdges = addEdge(
          { ...params, style: getEdgeStyle(params) },
          eds
        );
        localStorage.setItem('edges', JSON.stringify(updatedEdges));
        return updatedEdges;
      });
    },
    [nodes]
  );

  const getEdgeStyle = (edge) => {
    const sourceNode = nodes.find((node) => node.id === edge.source);
    const targetNode = nodes.find((node) => node.id === edge.target);

    if (!sourceNode || !targetNode) return { stroke: '#bbb' };

    const isSourceActive = sourceNode.className === 'custom-node';
    const isTargetActive = targetNode.className === 'custom-node';

    if (isSourceActive && isTargetActive) {
      return { stroke: 'gray', strokeWidth: 2 };
    }
    if (isSourceActive || isTargetActive) {
      return { stroke: 'gray', strokeWidth: 1, strokeDasharray: '5,5', animation: 'moveEdge 13s linear infinite' };
    }
    return { stroke: 'gray', strokeWidth: 0.5 };
  };

  const handleBackup = () => {
    const backupData = {
      nodes: JSON.parse(localStorage.getItem('nodes')) || [],
      edges: JSON.parse(localStorage.getItem('edges')) || [],
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setMessage('پشتیبان‌گیری انجام شد!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRestore = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        localStorage.setItem('nodes', JSON.stringify(data.nodes || []));
        localStorage.setItem('edges', JSON.stringify(data.edges || []));
        setMessage('بازیابی انجام شد!');
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage('خطا در خواندن فایل پشتیبان.');
        setTimeout(() => setMessage(''), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleNodeMouseEnter = useCallback((event, node) => {
    const { clientX, clientY } = event;
    setTooltip({
      visible: true,
      x: clientX,
      y: clientY,
      description: node.data?.description || 'اینجارو یادت رفت بنویسی ',
      time: node.data?.time || `تاریخ انجام هنوز وارد نشده `,
    });
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setTooltip({ visible: false, x: 0, y: 0, description: '' });
  }, []);

  const handleNodeMouseMove = useCallback((event) => {
    const { clientX, clientY } = event;
    setTooltip((prevTooltip) => ({
      ...prevTooltip,
      x: clientX,
      y: clientY,
    }));
  }, []);

  const handleNodeDoubleClick = useCallback(
    (event, node) => {
      setNodes((nds) => {
        const updatedNodes = nds.map((n) =>
          n.id === node.id
            ? {
                ...n,
                className: n.className === 'custom-node' ? '' : 'custom-node',
              }
            : n
        );

        localStorage.setItem('nodes', JSON.stringify(updatedNodes));

        return updatedNodes;
      });

      const currentNode = nodes.find((n) => n.id === node.id);
      const isActive = currentNode?.className === 'custom-node';
      const label = currentNode?.data?.label || `node ${node.id}`;

      if (isActive) {
        setMessage(`${label} غیرفعال شد.`);
      } else {
        setMessage(`${label} فعال شد.`);
      }

      setTimeout(() => setMessage(''), 3000);
    },
    [nodes]
  );

  const handleEdgeClick = useCallback(
    (event, edge) => {
      event.stopPropagation();
      setEdges((eds) => {
        const updatedEdges = eds.filter((e) => e.id !== edge.id);
        localStorage.setItem('edges', JSON.stringify(updatedEdges));
        return updatedEdges;
      });

      setMessage(`خط ${edge.id} حذف شد.`);
      setTimeout(() => setMessage(''), 3000);
    },
    []
  );

  return (
    <div style={{ height: '100%', backgroundColor: '#000000', position: 'relative' }}>
      {message && <div className="message">{message}</div>}

      <button className="backup-button" onClick={handleBackup}>
        <TfiSave />
      </button>

      <label className="restore-button">
        <LuArchiveRestore />
        <input
          type="file"
          accept="application/json"
          onChange={handleRestore}
          style={{ display: 'none' }}
        />
      </label>

      {tooltip.visible && (
        <div
          className="tooltip"
          style={{
            top: tooltip.y + 10,
            left: tooltip.x + 10,
          }}
        >
          <div>{tooltip.description}</div>
          <div style={{ marginTop: '5px', fontSize: '0.9em', color: '#aaa' }}>
            {tooltip.time}
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        edges={edges.map((edge) => ({
          ...edge,
          style: getEdgeStyle(edge),
        }))}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onNodeMouseMove={handleNodeMouseMove}
        onNodeDoubleClick={handleNodeDoubleClick}
        onEdgeClick={handleEdgeClick}
        fitView
      >
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable nodeColor={(node) => (node.className === 'custom-node' ? 'purple' : '#bbb')} />
      </ReactFlow>
    </div>
  );
}

export default Flow;
