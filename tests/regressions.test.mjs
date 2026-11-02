import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadTs(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { parseDiagram } = await loadTs('../utils/diagramData.ts');
const { contentBounds, visibleParts } = await loadTs('../utils/renderedGeometry.ts');
const documentFixture = () => ({ entities: [{ id: 'e', name: 'Client', x: -200, y: 30, width: 160, height: 100, attributes: [] }], associations: [{ id: 'a', label: 'connaît', x: 900000, y: -900000, attributes: [], connections: [{ id: 'c1', entityId: 'e', cardinality: '*' }, { id: 'c2', entityId: 'e', cardinality: '*' }] }] });
test('legacy, reflexive and negative-coordinate diagrams remain importable', () => {
  assert.deepEqual(parseDiagram(documentFixture()), documentFixture());
});
test('invalid numbers, duplicate IDs, dangling connections and invalid attributes are rejected', () => {
  for (const mutate of [d => d.entities[0].x = Infinity, d => d.entities[0].width = -1, d => d.entities.push(d.entities[0]), d => d.associations[0].connections[0].entityId = 'missing', d => d.entities[0].attributes = [{}], d => d.associations[0].entityBoxY = '900', d => d.associations[0].connections.push(d.associations[0].connections[0])]) {
    const d = documentFixture(); mutate(d); assert.throws(() => parseDiagram(d));
  }
});
class Matrix {
  constructor(scale = 1, x = 0, y = 0) { Object.assign(this, { scale, x, y }); }
  inverse() { return new Matrix(1 / this.scale, -this.x / this.scale, -this.y / this.scale); }
  multiply(m) { return new Matrix(this.scale * m.scale, this.x + m.x * this.scale, this.y + m.y * this.scale); }
}
globalThis.DOMPoint = class {
  constructor(x, y) { Object.assign(this, { x, y }); }
  matrixTransform(m) { return { x: this.x * m.scale + m.x, y: this.y * m.scale + m.y }; }
};
globalThis.getComputedStyle = el => ({ display: 'inline', visibility: 'visible', opacity: '1', ...el.style });
function part(box, matrix, attrs = {}, transient = false) {
  return { getBBox: () => box, getCTM: () => matrix, getAttribute: key => attrs[key] ?? null, closest: () => transient ? {} : null };
}
test('export bounds ignore invisible hit areas and transient selections, independent of zoom and pan', () => {
  const matrix = new Matrix(2, 500, -90);
  const actual = part({ x: 100, y: 20, width: 160, height: 100 }, matrix);
  const hit = part({ x: -10000, y: -10000, width: 20000, height: 20000 }, matrix, { stroke: 'transparent' });
  const selection = part({ x: -9000, y: -9000, width: 100, height: 100 }, matrix, {}, true);
  const layer = { getCTM: () => matrix, querySelectorAll: () => [actual, hit, selection] };
  assert.equal(visibleParts(layer).length, 1);
  assert.deepEqual(contentBounds(layer), { x: 100, y: 20, width: 160, height: 100 });
});
test('translated attribute boxes contribute their actual visible extent', () => {
  const layer = { getCTM: () => new Matrix(2, 500, -90), querySelectorAll: () => [part({ x: 0, y: 0, width: 140, height: 59 }, new Matrix(2, 1120, 450))] };
  assert.deepEqual(contentBounds(layer), { x: 310, y: 270, width: 140, height: 59 });
});
test('empty canvas has no export bounds', () => {
  assert.equal(contentBounds({ querySelectorAll: () => [] }), null);
});
test('Touiteur legacy import preserves coordinates and SQL metadata while defaulting missing isPk', async () => {
  const input = JSON.parse(await readFile(new URL('./fixtures/legacy-touiteur.json', import.meta.url), 'utf8'));
  const result = parseDiagram(input);
  assert.equal(result.entities.length, 3);
  assert.equal(result.associations.length, 5);
  assert.deepEqual(result.associations, input.associations);
  result.entities.forEach((entity, index) => {
    const original = input.entities[index];
    assert.deepEqual({ ...entity, attributes: original.attributes }, original);
    entity.attributes.forEach((attr, i) => assert.deepEqual(attr, { ...original.attributes[i], isPk: original.attributes[i].isPk ?? original.attributes[i].isPrimary ?? false }));
  });
  assert.equal(input.entities[0].attributes[1].isPk, undefined, 'import must not mutate its input');
});
test('legacy isPrimary keys are recognized without overriding an explicit isPk', () => {
  const input = documentFixture();
  input.entities[0].attributes = [{ id: 'pk', name: 'id', isPrimary: true }, { id: 'not-pk', name: 'value', isPrimary: true, isPk: false }];
  assert.deepEqual(parseDiagram(input).entities[0].attributes.map(a => a.isPk), [true, false]);
});
