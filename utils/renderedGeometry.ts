/** Geometry comes from rendered SVG, never stale coordinates of automatic labels. */
export function visibleParts(root: Element): SVGGraphicsElement[] {
  return Array.from(root.querySelectorAll<SVGGraphicsElement>('rect, text, line, path, polygon, polyline')).filter(el => {
    if (el.closest('[data-transient], defs') || el.getAttribute('stroke') === 'transparent') return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' &&
      !(el.getAttribute('fill') === 'transparent' && el.getAttribute('stroke') === 'none');
  });
}

export function worldBounds(el: SVGGraphicsElement, layer: SVGGraphicsElement) {
  const box = el.getBBox();
  const matrix = layer.getCTM()!.inverse().multiply(el.getCTM()!);
  const points = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
    .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
  return { x: Math.min(...points.map(p => p.x)), y: Math.min(...points.map(p => p.y)),
    right: Math.max(...points.map(p => p.x)), bottom: Math.max(...points.map(p => p.y)) };
}

export function contentBounds(layer: SVGGraphicsElement) {
  const boxes = visibleParts(layer).map(el => worldBounds(el, layer)).filter(b => Object.values(b).every(Number.isFinite));
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
  return { x, y, width: Math.max(...boxes.map(b => b.right)) - x, height: Math.max(...boxes.map(b => b.bottom)) - y };
}
