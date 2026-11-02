import React from 'react';
import { Association } from '../types';
import { getAssociationShapePoints } from '../utils/geometry';
import { useTheme } from './ThemeContext';

interface AssociationNodeProps {
  association: Association;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onEntityBoxMouseDown?: (e: React.MouseEvent, id: string) => void;
  isSelected: boolean;
}

export const AssociationNode: React.FC<AssociationNodeProps> = ({
  association,
  onMouseDown,
  onEntityBoxMouseDown,
  isSelected
}) => {
  const { theme } = useTheme();
  const count = association.connections.length;
  const isBinary = count <= 2;
  const points = getAssociationShapePoints(association);
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');

  // Attributes Box (Association Class style)
  const hasAttributes = association.attributes.length > 0;
  const displayName = association.entityName && association.entityName.trim() !== ''
    ? association.entityName
    : association.label;

  // Box dimensions
  const headerHeight = 30;
  const rowHeight = 24;
  const charWidth = 8;

  // Calculate width based on content
  const nameWidth = displayName.length * charWidth + 20;
  const maxAttrWidth = association.attributes.reduce((max, attr) => {
    const attrText = (attr.isPk ? 'PK ' : '') + attr.name;
    return Math.max(max, attrText.length * charWidth + 20);
  }, 0);
  const boxWidth = Math.max(140, nameWidth, maxAttrWidth);
  const boxHeight = Math.max(40, headerHeight + association.attributes.length * rowHeight + 5);

  // Position the attribute box - use custom position if available, otherwise default
  const defaultBoxX = association.x - boxWidth / 2;
  const defaultBoxY = association.y + (isBinary ? 30 : 60);

  const boxX = association.entityBoxX !== undefined ? association.entityBoxX : defaultBoxX;
  const boxY = association.entityBoxY !== undefined ? association.entityBoxY : defaultBoxY;

  // Center of the entity box for drawing the line
  const boxCenterX = boxX + boxWidth / 2;
  const boxCenterY = boxY + boxHeight / 2;

  return (
    <g className="select-none" data-association-id={association.id}>
      {/* Main association shape - draggable */}
      <g
        onMouseDown={(e) => onMouseDown(e, association.id)}
        onClick={(e) => e.stopPropagation()}
        className="cursor-move"
      >
        {/* Dashed line connecting shape to attribute box */}
        {hasAttributes && (
          <line
            x1={association.x} y1={association.y}
            x2={boxCenterX} y2={boxCenterY}
            stroke={theme === 'dark' ? '#94a3b8' : 'black'} strokeDasharray="4" strokeWidth="1"
            className="pointer-events-none"
          />
        )}

        {/* Main Shape */}
        <polygon
          points={pointsStr}
          fill={isBinary ? "transparent" : (theme === 'dark' ? '#1e293b' : 'white')}
          stroke={isBinary ? "none" : (isSelected ? "#3b82f6" : (theme === 'dark' ? '#475569' : '#000'))}
          strokeWidth={isSelected ? 3 : 1.5}
          className="transition-colors duration-200"
        />

        {/* If simple label, add a white background for readability */}
        {isBinary && (
          <rect
            x={points[0].x} y={points[0].y}
            width={points[2].x - points[0].x}
            height={points[2].y - points[0].y}
            fill={theme === 'dark' ? '#1e293b' : 'white'}
            fillOpacity="0.8"
            rx="4"
          />
        )}

        {/* Label */}
        <text
          x={association.x}
          y={association.y + 4}
          textAnchor="middle"
          className={`text-xs font-bold pointer-events-none ${isSelected && isBinary ? 'fill-blue-600' : (theme === 'dark' ? 'fill-slate-100' : 'fill-slate-900')}`}
        >
          {association.label}
        </text>
      </g>

      {/* Association Class Box (only if attributes exist) - separately draggable */}
      {hasAttributes && (
        <g
          transform={`translate(${boxX}, ${boxY})`}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (onEntityBoxMouseDown) {
              onEntityBoxMouseDown(e, association.id);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="cursor-move"
        >
          {/* Shadow/BG */}
          <rect
            width={boxWidth}
            height={boxHeight}
            fill={theme === 'dark' ? '#1e293b' : 'white'}
            stroke={isSelected ? "#3b82f6" : (theme === 'dark' ? '#475569' : '#000')}
            strokeWidth={1.5}
            rx={4}
          />
          {/* Header */}
          <rect
            width={boxWidth}
            height={headerHeight}
            fill={theme === 'dark' ? '#334155' : '#f3f4f6'}
            stroke={theme === 'dark' ? '#475569' : '#000'}
            strokeWidth={1}
            rx={4}
          />
          {/* Fix bottom corners of header */}
          <rect
            y={headerHeight - 5}
            width={boxWidth}
            height={5}
            fill={theme === 'dark' ? '#334155' : '#f3f4f6'}
          />
          <line x1={0} y1={headerHeight} x2={boxWidth} y2={headerHeight} stroke={theme === 'dark' ? '#475569' : 'black'} strokeWidth={1} />

          <text x={boxWidth / 2} y={20} textAnchor="middle" className={`font-bold text-sm pointer-events-none ${theme === 'dark' ? 'fill-slate-100' : 'fill-slate-900'}`}>{displayName}</text>

          {/* Attributes */}
          {association.attributes.map((attr, index) => (
            <text
              key={attr.id}
              x={10}
              y={headerHeight + 20 + index * rowHeight}
              className={`text-xs pointer-events-none ${attr.isPk ? 'font-bold underline' : ''} ${theme === 'dark' ? 'fill-slate-200' : 'fill-slate-800'}`}
            >
              {attr.name}
              {attr.isPk && <tspan className="fill-red-500"> PK</tspan>}
            </text>
          ))}
        </g>
      )}
    </g>
  );
};