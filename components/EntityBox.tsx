import React, { useMemo } from 'react';
import { Entity } from '../types';
import { useTheme } from './ThemeContext';

// Helper function to measure text width using Canvas API
const measureTextWidth = (text: string, font: string): number => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return text.length * 8; // Fallback
  context.font = font;
  return context.measureText(text).width;
};

interface EntityBoxProps {
  entity: Entity;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  isSelected: boolean;
}

export const EntityBox: React.FC<EntityBoxProps> = ({ entity, onMouseDown, isSelected }) => {
  const { theme } = useTheme();
  // Constants for styling
  const headerHeight = 30;
  const rowHeight = 24;
  const padding = 20; // Padding on both sides

  // Calculate width based on actual text measurements
  const calculatedWidth = useMemo(() => {
    const normalFont = '14px ui-sans-serif, system-ui, sans-serif';
    const boldFont = 'bold 14px ui-sans-serif, system-ui, sans-serif';

    // Measure entity name (bold, centered)
    const entityNameWidth = measureTextWidth(entity.name, boldFont) + padding;

    // Measure all attributes
    const maxAttrWidth = entity.attributes.reduce((max, attr) => {
      const font = attr.isPk ? boldFont : normalFont;
      const attrText = attr.name + (attr.isPk ? ' PK' : '');
      return Math.max(max, measureTextWidth(attrText, font) + padding);
    }, 0);

    return Math.max(entity.width, entityNameWidth, maxAttrWidth, 120);
  }, [entity.name, entity.attributes, entity.width]);

  // Dynamic height based on attributes
  const calculatedHeight = Math.max(
    entity.height,
    headerHeight + (entity.attributes.length * rowHeight) + padding
  );

  return (
    <g
      data-entity-id={entity.id}
      transform={`translate(${entity.x}, ${entity.y})`}
      onMouseDown={(e) => onMouseDown(e, entity.id)}
      onClick={(e) => e.stopPropagation()}
      className="cursor-move select-none"
    >
      {/* Shadow/Selection effect */}
      <rect
        width={calculatedWidth}
        height={calculatedHeight}
        fill={theme === 'dark' ? '#1e293b' : 'white'}
        stroke={isSelected ? "#3b82f6" : (theme === 'dark' ? '#475569' : '#000')}
        strokeWidth={isSelected ? 3 : 1.5}
        className="transition-colors duration-200"
        rx={4}
      />

      {/* Header (Class Name) */}
      <rect
        width={calculatedWidth}
        height={headerHeight}
        fill={theme === 'dark' ? '#334155' : '#f3f4f6'}
        stroke={theme === 'dark' ? '#475569' : '#000'}
        strokeWidth={1}
        rx={4}
      />
      {/* Fix bottom corners of header to be square */}
      <rect
        y={headerHeight - 5}
        width={calculatedWidth}
        height={5}
        fill={theme === 'dark' ? '#334155' : '#f3f4f6'}
      />
      <line x1={0} y1={headerHeight} x2={calculatedWidth} y2={headerHeight} stroke={theme === 'dark' ? '#475569' : 'black'} strokeWidth={1} />

      <text
        x={calculatedWidth / 2}
        y={20}
        textAnchor="middle"
        className={`font-bold text-sm pointer-events-none ${theme === 'dark' ? 'fill-slate-100' : 'fill-slate-900'}`}
      >
        {entity.name}
      </text>

      <g>
        {entity.attributes.map((attr, index) => (
          <text
            key={attr.id}
            x={10}
            y={headerHeight + 20 + (index * rowHeight)}
            className={`text-sm pointer-events-none ${attr.isPk ? 'font-bold' : ''} ${theme === 'dark' ? 'fill-slate-200' : 'fill-slate-800'}`}
            style={{ textDecoration: attr.isPk ? 'underline' : 'none' }}
          >
            {attr.name}
            {attr.isPk && <tspan className="fill-red-500"> PK</tspan>}
          </text>
        ))}
      </g>
    </g>
  );
};