import { Entity, Association } from '../types';
import { contentBounds } from './renderedGeometry';

export const handleExportJson = (entities: Entity[], associations: Association[]) => {
    const data = {
        entities,
        associations
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uml-studio_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const handleExportPng = (
    entities: Entity[],
    associations: Association[],
    setExportModal: (modal: { blob: Blob; url: string } | null) => void
) => {
    const svgElement = document.querySelector<SVGSVGElement>('#diagram-canvas');
    if (!svgElement) return;
    if (entities.length === 0 && associations.length === 0) {
        alert("Le diagramme est vide !");
        return;
    }

    const layer = svgElement.querySelector<SVGGElement>('#content-layer');
    const bounds = layer && contentBounds(layer);
    if (!bounds) return;
    const margin = 30;
    const minX = bounds.x - margin, minY = bounds.y - margin;
    const contentWidth = bounds.width + margin * 2;
    const contentHeight = bounds.height + margin * 2;

    // Clone the SVG to modify it
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

    // SVG images cannot inherit the page's CSS. Freeze typography and colors.
    const originals = svgElement.querySelectorAll('*');
    const copies = svgClone.querySelectorAll('*');
    originals.forEach((el, index) => {
        if (!['text', 'tspan'].includes(el.tagName)) return;
        const style = getComputedStyle(el);
        const copy = copies[index] as SVGElement;
        for (const prop of ['font-family', 'font-size', 'font-weight', 'text-decoration', 'fill']) {
            copy.style.setProperty(prop, style.getPropertyValue(prop));
        }
    });
    svgClone.querySelector('#grid-layer')?.remove();
    svgClone.querySelectorAll('[data-transient]').forEach(el => el.remove());
    svgClone.removeAttribute('class');
    svgClone.style.background = 'transparent';

    // Reset transforms on groups (zoom/pan) to ensure export is not affected by current view
    // Only target the specific layers (grid and content)
    ['#grid-layer', '#content-layer'].forEach(selector => {
        const g = svgClone.querySelector(selector);
        if (g) {
            g.removeAttribute('transform');
        }
    });

    // Convert dark mode colors to light theme for export
    // This ensures PNG export always uses light theme regardless of current theme
    const colorReplacements: { [key: string]: string } = {
        // Entity/box fills
        '#1e293b': 'white',           // dark bg -> white
        '#334155': '#f3f4f6',         // dark header -> light header
        // Strokes
        '#475569': '#000',            // dark border -> black
        '#94a3b8': 'black',           // dark line -> black
        // Text fills  
        '#f1f5f9': 'black',           // light text -> black
        '#a78bfa': '#7c3aed',         // light purple -> purple
    };

    // Replace colors in all elements
    const replaceColors = (element: Element) => {
        // Replace fill
        const fill = element.getAttribute('fill');
        if (fill && colorReplacements[fill]) {
            element.setAttribute('fill', colorReplacements[fill]);
        }
        // Replace stroke (but not for text elements using stroke for outline effect)
        const stroke = element.getAttribute('stroke');
        if (stroke && colorReplacements[stroke] && element.tagName !== 'text') {
            element.setAttribute('stroke', colorReplacements[stroke]);
        }
        // Replace style attribute colors
        const style = element.getAttribute('style');
        if (style) {
            let newStyle = style;

            // Handle text with paint-order (stroke outline effect)
            if (style.includes('paint-order')) {
                // Convert dark stroke to white for text outlines
                newStyle = newStyle.replace(/stroke:\s*#1e293b/gi, 'stroke: white');
                newStyle = newStyle.replace(/stroke:\s*rgb\(30,\s*41,\s*59\)/gi, 'stroke: white');
                // Convert light text fill to dark
                newStyle = newStyle.replace(/fill:\s*#f1f5f9/gi, 'fill: black');
                newStyle = newStyle.replace(/fill:\s*rgb\(241,\s*245,\s*249\)/gi, 'fill: black');
                // Convert light purple to standard purple
                newStyle = newStyle.replace(/fill:\s*#a78bfa/gi, 'fill: #7c3aed');
                newStyle = newStyle.replace(/fill:\s*rgb\(167,\s*139,\s*250\)/gi, 'fill: #7c3aed');
            } else {
                // For non-text elements, apply standard color replacements
                Object.entries(colorReplacements).forEach(([dark, light]) => {
                    newStyle = newStyle.replace(new RegExp(dark, 'gi'), light);
                });
            }
            element.setAttribute('style', newStyle);
        }
        // Recurse to children
        Array.from(element.children).forEach(child => replaceColors(child));
    };
    replaceColors(svgClone);

    // Remove selection highlights (blue strokes and selection boxes)
    // Replace selection blue with normal black stroke
    const removeSelection = (element: Element) => {
        const stroke = element.getAttribute('stroke');
        if (stroke === '#3b82f6') {
            element.setAttribute('stroke', '#000');
            // Reset stroke width if it was thickened for selection
            const strokeWidth = element.getAttribute('stroke-width');
            if (strokeWidth === '3' || strokeWidth === '2.5') {
                element.setAttribute('stroke-width', '1.5');
            }
        }
        // Remove selection highlight rectangles (dbeafe fill)
        const fill = element.getAttribute('fill');
        if (fill === '#dbeafe') {
            element.remove();
            return;
        }
        // Recurse to children
        Array.from(element.children).forEach(child => removeSelection(child));
    };
    removeSelection(svgClone);

    // Also fix class-based fills (Tailwind classes)
    const textElements = svgClone.querySelectorAll('text, tspan');
    textElements.forEach(el => {
        const className = el.getAttribute('class') || '';
        if (className.includes('fill-slate-100') || className.includes('fill-slate-200')) {
            el.setAttribute('class', className.replace(/fill-slate-100|fill-slate-200/g, 'fill-slate-800'));
        }
    });

    // High resolution scale factor (3x for crisp export)
    const scale = Math.min(3, 8192 / Math.max(contentWidth, contentHeight), Math.sqrt(24000000 / (contentWidth * contentHeight)));

    // Set viewBox to crop to content area
    svgClone.setAttribute('viewBox', `${minX} ${minY} ${contentWidth} ${contentHeight}`);
    svgClone.setAttribute('width', contentWidth.toString());
    svgClone.setAttribute('height', contentHeight.toString());

    // Serialize SVG
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone)
        .replace(/rgb\(241, 245, 249\)|rgb\(226, 232, 240\)|rgb\(59, 130, 246\)|rgb\(37, 99, 235\)/g, '#0f172a');
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // Create image and canvas
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        // Scale up canvas for higher resolution
        canvas.width = contentWidth * scale;
        canvas.height = contentHeight * scale;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            // Scale the context to draw at higher resolution
            ctx.scale(scale, scale);

            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw image (transparent background by default)
            ctx.drawImage(img, 0, 0, contentWidth, contentHeight);

            // Export as PNG with maximum quality
            canvas.toBlob((blob) => {
                if (!blob) alert('Impossible de générer cette image.');
                if (blob) {
                    const pngUrl = URL.createObjectURL(blob);
                    // Show export modal with options
                    setExportModal({ blob, url: pngUrl });
                }
            }, 'image/png');
        }

        URL.revokeObjectURL(url);
    };
    img.onerror = () => {
        URL.revokeObjectURL(url);
        alert("Impossible de générer l’image. Réessayez après avoir réduit le diagramme.");
    };
    img.src = url;
};
