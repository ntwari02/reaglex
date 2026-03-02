import React from 'react';
import { motion } from 'framer-motion';

interface SankeyNode {
  id: string;
  label: string;
  value?: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface SankeyChartProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  title?: string;
  height?: number;
}

export function SankeyChart({ nodes, links, title, height = 400 }: SankeyChartProps) {
  // Calculate node positions and sizes
  const nodeHeight = 30;
  const nodeSpacing = 10;
  const columnWidth = 25;
  
  // Group nodes by column (simplified - in real implementation, you'd use a layout algorithm)
  const columns: SankeyNode[][] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // Simple column assignment (you'd want a proper layout algorithm)
  nodes.forEach((node, index) => {
    const colIndex = Math.floor(index / 4);
    if (!columns[colIndex]) columns[colIndex] = [];
    columns[colIndex].push(node);
  });

  const getNodePosition = (nodeId: string, columnIndex: number) => {
    const nodeIndex = columns[columnIndex].findIndex(n => n.id === nodeId);
    const x = columnIndex * columnWidth;
    const y = nodeIndex * (nodeHeight + nodeSpacing) + nodeSpacing;
    return { x, y };
  };

  // Calculate link paths
  const getLinkPath = (link: SankeyLink) => {
    const sourceCol = columns.findIndex(col => col.some(n => n.id === link.source));
    const targetCol = columns.findIndex(col => col.some(n => n.id === link.target));
    if (sourceCol === -1 || targetCol === -1) return '';

    const sourcePos = getNodePosition(link.source, sourceCol);
    const targetPos = getNodePosition(link.target, targetCol);
    
    const sourceX = sourcePos.x + columnWidth;
    const sourceY = sourcePos.y + nodeHeight / 2;
    const targetX = targetPos.x;
    const targetY = targetPos.y + nodeHeight / 2;
    
    const midX = (sourceX + targetX) / 2;
    
    return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
  };

  const maxLinkValue = Math.max(...links.map(l => l.value));
  const getLinkWidth = (value: number) => {
    return Math.max(2, (value / maxLinkValue) * 20);
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      )}
      <div className="relative overflow-x-auto" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${columns.length * columnWidth + columnWidth} ${columns[0]?.length * (nodeHeight + nodeSpacing) + nodeSpacing || height}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Links */}
          {links.map((link, index) => {
            const path = getLinkPath(link);
            if (!path) return null;
            
            return (
              <motion.path
                key={`link-${index}`}
                d={path}
                fill="none"
                stroke="url(#linkGradient)"
                strokeWidth={getLinkWidth(link.value)}
                strokeOpacity="0.6"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={{ duration: 1, delay: index * 0.1 }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, index) => {
            const colIndex = columns.findIndex(col => col.some(n => n.id === node.id));
            if (colIndex === -1) return null;
            const pos = getNodePosition(node.id, colIndex);
            
            return (
              <g key={node.id}>
                <motion.rect
                  x={pos.x}
                  y={pos.y}
                  width={columnWidth}
                  height={nodeHeight}
                  rx="4"
                  fill="url(#nodeGradient)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
                <text
                  x={pos.x + columnWidth / 2}
                  y={pos.y + nodeHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-white font-medium"
                  fontSize="8"
                >
                  {node.label.length > 8 ? node.label.substring(0, 8) + '...' : node.label}
                </text>
              </g>
            );
          })}

          {/* Gradients */}
          <defs>
            <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

