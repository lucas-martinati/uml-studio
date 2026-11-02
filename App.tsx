import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Plus, Minus, Maximize, Undo2, Redo2, Image, HelpCircle, PanelsTopLeft } from 'lucide-react';
import { parseDiagram } from './utils/diagramData';
import { contentBounds } from './utils/renderedGeometry';
import { Sidebar } from './components/Sidebar';
import { DiagramCanvas } from './components/DiagramCanvas';
import { Entity, Association } from './types';
import { useTheme } from './components/ThemeContext';
import { handleExportJson, handleExportPng } from './utils/exportUtils';

// Initial data compatible with new N-ary structure
const initialEntities: Entity[] = [
  {
    id: '1',
    name: 'Skieur',
    x: 100,
    y: 100,
    width: 160,
    height: 100,
    attributes: [
      { id: 'a1', name: 'nomski', isPk: true },
      { id: 'a2', name: 'spécialité', isPk: false },
    ]
  },
  {
    id: '2',
    name: 'Compétition',
    x: 500,
    y: 300,
    width: 160,
    height: 100,
    attributes: [
      { id: 'b1', name: 'refcomp', isPk: true },
      { id: 'b2', name: 'datecomp', isPk: false },
    ]
  },
  {
    id: '3',
    name: 'Station',
    x: 600,
    y: 50,
    width: 160,
    height: 120,
    attributes: [
      { id: 'c1', name: 'nomstat', isPk: true },
      { id: 'c2', name: 'altstat', isPk: false },
    ]
  }
];

const initialAssociations: Association[] = [
  {
    id: 'rel1',
    label: 'Participe',
    entityName: 'Participation', // Example Named Entity Association
    x: 350,
    y: 250,
    attributes: [
      { id: 'attr_score', name: 'score', isPk: false }
    ],
    connections: [
      { id: 'c1', entityId: '1', cardinality: '1..*' },
      { id: 'c2', entityId: '2', cardinality: '0..*' }
    ]
  },
  {
    id: 'rel2',
    label: 'se déroule',
    x: 680,
    y: 230,
    attributes: [],
    connections: [
      { id: 'c3', entityId: '2', cardinality: '*' },
      { id: 'c4', entityId: '3', cardinality: '1' }
    ]
  }
];

export default function App() {
  const { theme } = useTheme();
  const [initialDocument] = useState(() => {
    try {
      const saved = localStorage.getItem('uml-studio-document');
      if (saved) return parseDiagram(JSON.parse(saved));
    } catch { /* Preserve malformed storage until the user explicitly edits the document. */ }
    return { entities: initialEntities, associations: initialAssociations };
  });
  const [entities, setEntities] = useState<Entity[]>(initialDocument.entities);
  const [associations, setAssociations] = useState<Association[]>(initialDocument.associations);
  const [saveStatus, setSaveStatus] = useState('Sauvegarde locale');
  useEffect(() => {
    if (entities === initialDocument.entities && associations === initialDocument.associations) return;
    setSaveStatus('Enregistrement…');
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem('uml-studio-document', JSON.stringify({ entities, associations }));
        setSaveStatus('Enregistré sur cet appareil');
      } catch { setSaveStatus('Sauvegarde indisponible · exportez en JSON'); }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [entities, associations, initialDocument]);

  // Multi-selection: Map of id -> type for all selected items
  const [selectedItems, setSelectedItems] = useState<Map<string, 'entity' | 'association'>>(new Map());

  // View state (Zoom/Pan) - Lifted up to allow reset on import
  const [fitRequest, setFitRequest] = useState(0);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Focus field state for auto-focus in Sidebar
  const [focusField, setFocusField] = useState<{ type: 'entity-name' | 'association-label' | 'cardinality'; id: string; connectionIndex?: number } | null>(null);

  // Export modal state
  const [exportModal, setExportModal] = useState<{ blob: Blob; url: string } | null>(null);

  // History for undo functionality
  const [history, setHistory] = useState<Array<{ entities: Entity[]; associations: Association[] }>>([]);
  const [future, setFuture] = useState<Array<{ entities: Entity[]; associations: Association[] }>>([]);
  const [showHelp, setShowHelp] = useState(false);
  const maxHistorySize = 50;

  // Save current state to history
  const saveToHistory = () => {
    setFuture([]);
    setHistory(prev => {
      const newHistory = [...prev, { entities, associations }];
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(-maxHistorySize);
      }
      return newHistory;
    });
  };

  // Undo function
  const handleUndo = () => {

    if (history.length === 0) return;

    setFuture(prev => [...prev, { entities, associations }]);
    const previousState = history[history.length - 1];
    setEntities(previousState.entities);
    setAssociations(previousState.associations);
    setHistory(prev => prev.slice(0, -1));
    setSelectedItems(new Map());
    setToast({ message: "Annulé", type: 'success' });
  };

  const handleRedo = () => {
    const next = future.at(-1);
    if (!next) return;
    setHistory(prev => [...prev, { entities, associations }]);
    setEntities(next.entities); setAssociations(next.associations);
    setFuture(prev => prev.slice(0, -1)); setSelectedItems(new Map());
  };

  const fitDiagram = () => {
    const svg = document.querySelector<SVGSVGElement>('#diagram-canvas');
    const layer = svg?.querySelector<SVGGElement>('#content-layer');
    const bounds = layer && contentBounds(layer);
    if (!svg || !bounds) { setView({ x: 0, y: 0, zoom: 1 }); return; }
    const { width, height } = svg.getBoundingClientRect();
    const zoom = Math.min(2, Math.max(0.1, Math.min((width - 100) / (bounds.width + 60), (height - 180) / (bounds.height + 60))));
    setView({ zoom, x: (width - bounds.width * zoom) / 2 - bounds.x * zoom, y: (height - bounds.height * zoom) / 2 - bounds.y * zoom });
  };
  // Wait until React has rendered the imported geometry before measuring it.
  useLayoutEffect(() => {
    fitDiagram();
  }, [fitRequest]);

  const zoomBy = (factor: number) => {
    const rect = document.querySelector('#diagram-canvas')!.getBoundingClientRect();
    const zoom = Math.max(0.1, Math.min(5, view.zoom * factor));
    setView({ zoom, x: rect.width / 2 - (rect.width / 2 - view.x) * zoom / view.zoom,
      y: rect.height / 2 - (rect.height / 2 - view.y) * zoom / view.zoom });
  };

  // Keyboard shortcuts: Delete and Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (exportModal) {
        if (e.key === 'Escape') { URL.revokeObjectURL(exportModal.url); setExportModal(null); }
        return;
      }
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

      // For Delete key (not Backspace), check if we should delete the entity/association
      if (e.key === 'Delete') {
        if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

        if (selectedItems.size > 0) {
          e.preventDefault();
          // Blur any focused input before deleting
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          // Delete all selected items
          saveToHistory();
          selectedItems.forEach((type, id) => {
            if (type === 'entity') {
              setEntities(prev => prev.filter(e => e.id !== id));
              // Also update associations that reference this entity
              setAssociations(prevAssocs => {
                return prevAssocs.reduce((acc, assoc) => {
                  const isConnected = assoc.connections.some(c => c.entityId === id);
                  if (!isConnected) {
                    acc.push(assoc);
                  } else if (assoc.connections.length > 2) {
                    acc.push({
                      ...assoc,
                      connections: assoc.connections.filter(c => c.entityId !== id)
                    });
                  }
                  return acc;
                }, [] as Association[]);
              });
            } else {
              setAssociations(prev => prev.filter(a => a.id !== id));
            }
          });
          setSelectedItems(new Map());
        }
      }

      // Ctrl+Z - Undo (only if not in input)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {

        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {

          return;
        }
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, entities, associations, history, future, exportModal]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAddEntity = (name: string) => {
    saveToHistory();
    const newEntity: Entity = {
      id: crypto.randomUUID(),
      name,
      x: (160 - view.x) / view.zoom,
      y: (160 - view.y) / view.zoom,
      width: 160,
      height: 80,
      attributes: []
    };
    setEntities(prev => [...prev, newEntity]);
    setSelectedItems(new Map([[newEntity.id, 'entity']]));
  };

  // Create entity at specific position (for double-click)
  const handleCreateEntityAtPosition = (x: number, y: number) => {
    saveToHistory();
    const newEntity: Entity = {
      id: crypto.randomUUID(),
      name: 'Nouvelle entité',
      x,
      y,
      width: 160,
      height: 80,
      attributes: []
    };
    setEntities(prev => [...prev, newEntity]);
    setSelectedItems(new Map([[newEntity.id, 'entity']]));
    setFocusField({ type: 'entity-name', id: newEntity.id });
  };

  // Quick connect entities (for Ctrl+click)
  const handleQuickConnect = (sourceId: string, sourceType: 'entity' | 'association', targetEntityId: string) => {
    saveToHistory();
    if (sourceType === 'entity') {
      // Create a new association between two entities
      const sourceEntity = entities.find(e => e.id === sourceId);
      const targetEntity = entities.find(e => e.id === targetEntityId);
      if (!sourceEntity || !targetEntity) return;

      // Calculate position at midpoint between entities
      const midX = (sourceEntity.x + sourceEntity.width / 2 + targetEntity.x + targetEntity.width / 2) / 2;
      const midY = (sourceEntity.y + sourceEntity.height / 2 + targetEntity.y + targetEntity.height / 2) / 2;

      const newAssoc: Association = {
        id: crypto.randomUUID(),
        label: '',
        x: midX,
        y: midY,
        attributes: [],
        connections: [
          { id: crypto.randomUUID(), entityId: sourceId, cardinality: '0..*' },
          { id: crypto.randomUUID(), entityId: targetEntityId, cardinality: '0..*' }
        ]
      };
      setAssociations(prev => [...prev, newAssoc]);
      setSelectedItems(new Map([[newAssoc.id, 'association']]));
      setFocusField({ type: 'association-label', id: newAssoc.id });
    } else {
      // Add a connection to an existing association
      const assoc = associations.find(a => a.id === sourceId);
      if (!assoc) return;

      // Check if the entity is already connected
      if (assoc.connections.some(c => c.entityId === targetEntityId)) return;

      const updatedAssoc: Association = {
        ...assoc,
        connections: [
          ...assoc.connections,
          { id: crypto.randomUUID(), entityId: targetEntityId, cardinality: '0..*' }
        ]
      };
      setAssociations(prev => prev.map(a => a.id === sourceId ? updatedAssoc : a));
      setSelectedItems(new Map([[sourceId, 'association']]));
      setFocusField({ type: 'association-label', id: sourceId });
    }
  };

  const handleFocusHandled = () => {
    setFocusField(null);
  };

  const handleUpdateEntity = (updated: Entity) => {
    saveToHistory();
    setEntities(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  // Direct delete without confirmation (called from keyboard shortcut)
  const handleDeleteEntityDirect = (id: string) => {
    saveToHistory();
    // 1. Remove entity
    setEntities(prev => prev.filter(e => e.id !== id));

    // 2. Update associations based on rules
    setAssociations(prevAssocs => {
      return prevAssocs.reduce((acc, assoc) => {
        const isConnected = assoc.connections.some(c => c.entityId === id);

        if (!isConnected) {
          acc.push(assoc);
        } else {
          if (assoc.connections.length > 2) {
            acc.push({
              ...assoc,
              connections: assoc.connections.filter(c => c.entityId !== id)
            });
          }
        }
        return acc;
      }, [] as Association[]);
    });

    setSelectedItems(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  // Delete from sidebar button (no confirmation now)
  const handleDeleteEntity = (id: string) => {
    handleDeleteEntityDirect(id);
  };

  const handleAddAssociation = (assoc: Omit<Association, 'id'>) => {
    saveToHistory();
    const newAssoc = { ...assoc, id: crypto.randomUUID() };
    setAssociations(prev => [...prev, newAssoc]);
    setSelectedItems(new Map([[newAssoc.id, 'association']]));
  };

  const handleUpdateAssociation = (updated: Association) => {
    saveToHistory();
    const previous = associations.find(a => a.id === updated.id);
    if (previous?.connections.length === 2 && !previous.isLabelMovable && (updated.isLabelMovable || updated.connections.length !== 2)) {
      const groups = document.querySelectorAll<SVGGElement>('[data-association-id]');
      const group = Array.from(groups).find(g => g.dataset.associationId === updated.id);
      const label = group?.querySelector<SVGTextElement>('[data-association-label]');
      if (label) updated = { ...updated, x: Number(label.getAttribute('x')), y: Number(label.getAttribute('y')) - (previous.connections[0].entityId === previous.connections[1].entityId ? 4 : -2) };
    }
    setAssociations(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  // Direct delete without confirmation (called from keyboard shortcut)
  const handleDeleteAssociationDirect = (id: string) => {
    saveToHistory();
    setAssociations(prev => prev.filter(a => a.id !== id));
    setSelectedItems(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const handleDeleteAssociation = (id: string) => {
    handleDeleteAssociationDirect(id);
  };

  // Store initial positions when multi-drag starts
  const dragStartPositions = useRef<Map<string, { x: number; y: number; entityBoxX?: number; entityBoxY?: number }> | null>(null);

  // Multi-move: when one selected item is moved, move all selected items by the same delta
  const handleMove = (id: string, x: number, y: number, type: 'entity' | 'association', deltaX?: number, deltaY?: number) => {
    // If delta is provided and there are multiple selected items, move all selected
    if (deltaX !== undefined && deltaY !== undefined && selectedItems.size > 1 && selectedItems.has(id)) {
      // Initialize start positions on first move
      if (!dragStartPositions.current) {
        const startPos = new Map<string, { x: number; y: number; entityBoxX?: number; entityBoxY?: number }>();
        entities.forEach(e => {
          if (selectedItems.has(e.id)) {
            startPos.set(e.id, { x: e.x, y: e.y });
          }
        });
        associations.forEach(a => {
          if (selectedItems.has(a.id)) {
            startPos.set(a.id, { x: a.x, y: a.y, entityBoxX: a.entityBoxX, entityBoxY: a.entityBoxY });
          }
        });
        dragStartPositions.current = startPos;
      }

      // Move all selected entities using absolute delta from their start positions
      setEntities(prev => prev.map(e => {
        if (selectedItems.get(e.id) === 'entity') {
          const startPos = dragStartPositions.current?.get(e.id) || { x: e.x - deltaX, y: e.y - deltaY };
          return { ...e, x: startPos.x + deltaX, y: startPos.y + deltaY };
        }
        return e;
      }));

      // Move all selected associations (including their entity box if it exists)
      setAssociations(prev => prev.map(a => {
        if (selectedItems.get(a.id) === 'association') {
          const startPos = dragStartPositions.current?.get(a.id) || { x: a.x - deltaX, y: a.y - deltaY };
          const updated: typeof a = { ...a, x: startPos.x + deltaX, y: startPos.y + deltaY };
          // Also move the entity box if it has custom position
          if (startPos.entityBoxX !== undefined) {
            updated.entityBoxX = startPos.entityBoxX + deltaX;
          }
          if (startPos.entityBoxY !== undefined) {
            updated.entityBoxY = startPos.entityBoxY + deltaY;
          }
          return updated;
        }
        return a;
      }));
    } else {
      // Single item move - clear start positions
      if (dragStartPositions.current) {
        dragStartPositions.current = null;
      }
      if (type === 'entity') {
        setEntities(prev => prev.map(e => e.id === id ? { ...e, x, y } : e));
      } else {
        setAssociations(prev => prev.map(a => a.id === id ? { ...a, x, y } : a));
      }
    }
  };

  // Clear drag start positions when selection changes or drag ends
  useEffect(() => {
    dragStartPositions.current = null;
  }, [selectedItems]);

  const handleMoveEntityBox = (id: string, x: number, y: number) => {
    setAssociations(prev => prev.map(a =>
      a.id === id ? { ...a, entityBoxX: x, entityBoxY: y } : a
    ));
  };

  // Multi-selection handler: supports single click, Ctrl+click toggle, and marquee set
  const handleSelect = (
    id: string | null,
    type: 'entity' | 'association' | null,
    options?: { ctrlKey?: boolean; setSelection?: Map<string, 'entity' | 'association'> }
  ) => {
    // If setting selection from marquee
    if (options?.setSelection) {
      setSelectedItems(options.setSelection);
      return;
    }

    // Clicking empty canvas: clear selection
    if (id === null) {
      setSelectedItems(new Map());
      return;
    }

    // Ctrl+click: toggle selection
    if (options?.ctrlKey) {
      setSelectedItems(prev => {
        const next = new Map(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.set(id, type!);
        }
        return next;
      });
      return;
    }

    // Normal click: single select
    setSelectedItems(new Map([[id, type!]]));


  };


  // Export Logic
  const handleExport = () => {
    handleExportJson(entities, associations);
  };

  // Export PNG Logic
  const handleExportPngWrapper = () => {
    handleExportPng(entities, associations, setExportModal);
  };

  // Clear All Logic
  const handleClear = () => {
    if (entities.length === 0 && associations.length === 0) return;
    if (window.confirm("Voulez-vous vraiment effacer tout le diagramme ?")) {
      saveToHistory();
      setEntities([]);
      setAssociations([]);
      setSelectedItems(new Map());
      setView({ x: 0, y: 0, zoom: 1 });
    }
  };

  // Import Logic
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if ((entities.length > 0 || associations.length > 0) && !window.confirm("Importer écrasera le diagramme actuel. Continuer ?")) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const data = parseDiagram(JSON.parse(json));

        if (Array.isArray(data.entities) && Array.isArray(data.associations)) {
          saveToHistory();
          setEntities(data.entities);
          setAssociations(data.associations);
          setSelectedItems(new Map());
          setFitRequest(request => request + 1);
          setToast({ message: "Import réussi !", type: 'success' });
        } else {
          setToast({ message: "Format de fichier invalide.", type: 'error' });
        }
      } catch (err) {
        console.error(err);
        setToast({ message: err instanceof Error ? err.message : 'Fichier invalide.', type: 'error' });
      }
    };
    reader.onerror = () => setToast({ message: 'Impossible de lire ce fichier.', type: 'error' });
    reader.readAsText(file);
  };

  return (
    <div className={`app-shell flex h-screen w-screen overflow-hidden font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* Toast notification */}
      {toast && (
        <div role="status"
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
        >
          {toast.message}
        </div>
      )}

      <main className="workspace flex-1 min-w-0 relative">
        <header className="workspace-header">
          <div className="brand-mark"><PanelsTopLeft size={22} /></div>
          <div><h1>UML <span>Studio</span></h1><p aria-live="polite">{saveStatus}</p></div>
          <button className="export-button" onClick={handleExportPngWrapper}><Image size={16} /> Exporter PNG</button>
        </header>
        <DiagramCanvas
          onDragStart={saveToHistory}
          onDragEnd={() => { dragStartPositions.current = null; }}
          entities={entities}
          associations={associations}
          onMove={handleMove}
          onMoveEntityBox={handleMoveEntityBox}
          selectedItems={selectedItems}
          onSelect={handleSelect}
          onCreateEntityAtPosition={handleCreateEntityAtPosition}
          onQuickConnect={handleQuickConnect}
          onCardinalityClick={(assocId, connectionIndex) => {
            setFocusField({ type: 'cardinality', id: assocId, connectionIndex });
          }}
          view={view}
          onViewChange={setView}
        />

        <div className="canvas-status">{entities.length} entités <span>·</span> {associations.length} relations{selectedItems.size > 0 && <strong> · {selectedItems.size} sélectionnés</strong>}</div>
        <div className="canvas-toolbar" aria-label="Commandes du diagramme">
          <button title="Annuler (Ctrl+Z)" aria-label="Annuler" onClick={handleUndo} disabled={!history.length}><Undo2 size={18} /></button>
          <button title="Rétablir (Ctrl+Shift+Z)" aria-label="Rétablir" onClick={handleRedo} disabled={!future.length}><Redo2 size={18} /></button>
          <i />
          <button title="Dézoomer" aria-label="Dézoomer" onClick={() => zoomBy(1 / 1.2)}><Minus size={18} /></button>
          <span>{Math.round(view.zoom * 100)} %</span>
          <button title="Zoomer" aria-label="Zoomer" onClick={() => zoomBy(1.2)}><Plus size={18} /></button>
          <button title="Centrer le diagramme" aria-label="Centrer le diagramme" onClick={fitDiagram}><Maximize size={18} /></button>
          <i /><button title="Raccourcis" aria-label="Afficher les raccourcis" aria-expanded={showHelp} onClick={() => setShowHelp(!showHelp)}><HelpCircle size={18} /></button>
        </div>
        {showHelp && <aside className="canvas-help"><strong>À portée de main</strong><p>Double-clic dans le vide : créer une entité</p><p>Shift + glisser : relier deux éléments</p><p>Ctrl / ⌘ + clic : sélection multiple</p><p>Glisser dans le vide : encadrer une sélection</p><p>Clic droit + glisser : déplacer la vue</p><p>Molette : déplacer la vue · Ctrl + molette : zoomer</p><p>Suppr : supprimer · Ctrl + Z : annuler</p></aside>}
      </main>

      <Sidebar
        entities={entities}
        associations={associations}
        onAddEntity={handleAddEntity}
        onUpdateEntity={handleUpdateEntity}
        onDeleteEntity={handleDeleteEntity}
        onAddAssociation={handleAddAssociation}
        onUpdateAssociation={handleUpdateAssociation}
        onDeleteAssociation={handleDeleteAssociation}
        selectedItems={selectedItems}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
        focusField={focusField}
        onFocusHandled={handleFocusHandled}
      />

      {/* Export Modal */}
      {exportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
          URL.revokeObjectURL(exportModal.url);
          setExportModal(null);
        }}>
          <div
            role="dialog" aria-modal="true" aria-label="Exporter l’image"
            className={`p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
              Exporter l'image
            </h3>

            {/* Preview */}
            <div className="mb-4 border rounded-lg overflow-hidden">
              <img src={exportModal.url} alt="Aperçu du diagramme" className="w-full h-auto max-h-48 object-contain bg-gray-100" />
            </div>

            <div className="flex flex-col gap-3">
              {/* Copy to Clipboard */}
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.write([
                      new ClipboardItem({ 'image/png': exportModal.blob })
                    ]);
                    setToast({ message: 'Image copiée dans le presse-papiers !', type: 'success' });
                    URL.revokeObjectURL(exportModal.url);
                    setExportModal(null);
                  } catch (err) {
                    console.error('Clipboard write failed:', err);
                    setToast({ message: 'Erreur: impossible de copier', type: 'error' });
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copier dans le presse-papiers
              </button>

              {/* Save File */}
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = exportModal.url;
                  a.download = `uml-studio_${new Date().toISOString().slice(0, 10)}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(exportModal.url);
                  setExportModal(null);
                  setToast({ message: 'Image téléchargée !', type: 'success' });
                }}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium border ${theme === 'dark' ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-gray-300 text-slate-700 hover:bg-gray-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Enregistrer l'image
              </button>

              {/* Cancel */}
              <button
                onClick={() => {
                  URL.revokeObjectURL(exportModal.url);
                  setExportModal(null);
                }}
                className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}