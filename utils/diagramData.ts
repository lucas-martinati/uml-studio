import type { Association, Attribute, Entity } from '../types';

export type Diagram = { entities: Entity[]; associations: Association[] };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const coordinate = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1000000;
function normalizeAttributes(value: unknown): Attribute[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('Liste d’attributs invalide.');
  const result = value.map(a => {
    if (!record(a) || !text(a.id) || !text(a.name) || (a.isPk !== undefined && typeof a.isPk !== 'boolean') || (a.isPrimary !== undefined && typeof a.isPrimary !== 'boolean')) throw new Error('Un attribut contient des données invalides.');
    return { ...a, isPk: a.isPk ?? a.isPrimary ?? false } as unknown as Attribute;
  });
  if (new Set(result.map(a => a.id)).size !== result.length) throw new Error('Identifiants d’attributs en double.');
  return result;
}

/** Reject broken imports before replacing the current document. Older optional fields remain supported. */
export function parseDiagram(value: unknown): Diagram {
  if (!record(value) || !Array.isArray(value.entities) || !Array.isArray(value.associations)) throw new Error('Structure de fichier invalide.');
  const entities = value.entities.map((e): Record<string, unknown> => {
    if (!record(e)) throw new Error('Entité invalide.');
    return { ...e, attributes: normalizeAttributes(e.attributes) };
  });
  if (!entities.every(e => record(e) && text(e.id) && text(e.name) && coordinate(e.x) && coordinate(e.y) && coordinate(e.width) && coordinate(e.height) && e.width > 0 && e.height > 0)) throw new Error('Une entité contient des données invalides.');
  const ids = new Set(entities.map(e => e.id));
  if (ids.size !== entities.length) throw new Error('Identifiants d’entités en double.');
  const associations = value.associations.map((a): Record<string, unknown> => {
    if (!record(a)) throw new Error('Relation invalide.');
    return { ...a, attributes: normalizeAttributes(a.attributes) };
  });
  if (!associations.every(a => record(a) && text(a.id) && !ids.has(a.id) && text(a.label) && coordinate(a.x) && coordinate(a.y) &&
    (a.entityName === undefined || text(a.entityName)) && (a.isLabelMovable === undefined || typeof a.isLabelMovable === 'boolean') &&
    (a.relationType === undefined || ['association', 'inheritance', 'interface'].includes(a.relationType as string)) &&
    (a.entityBoxX === undefined || coordinate(a.entityBoxX)) && (a.entityBoxY === undefined || coordinate(a.entityBoxY)) &&
    Array.isArray(a.connections) && a.connections.every(c => record(c) && text(c.id) && ids.has(c.entityId) && text(c.cardinality)) &&
    new Set(a.connections.map(c => c.id)).size === a.connections.length)) throw new Error('Une relation est invalide ou référence une entité absente.');
  if (new Set(associations.map(a => a.id)).size !== associations.length) throw new Error('Identifiants de relations en double.');
  return { entities: entities as unknown as Entity[], associations: associations as unknown as Association[] };
}
