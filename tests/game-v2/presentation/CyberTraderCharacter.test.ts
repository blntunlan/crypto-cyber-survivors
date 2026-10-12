import { Box3, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createCyberTraderCharacter,
  CYBER_TRADER_CHARACTER_BUDGET,
} from '@/game-v2/presentation/CyberTraderCharacter';

describe('CyberTraderCharacter', () => {
  it('creates a readable low-cost character inside the gameplay asset budget', () => {
    const character = createCyberTraderCharacter();
    const meshes: Mesh[] = [];
    const materials = new Set<MeshStandardMaterial>();
    let triangles = 0;

    character.traverse(node => {
      if (!(node instanceof Mesh)) {
        return;
      }

      meshes.push(node);
      const material = node.material;
      if (material instanceof MeshStandardMaterial) {
        materials.add(material);
      }
      const indexCount = node.geometry.index?.count;
      const positionCount = node.geometry.attributes.position?.count ?? 0;
      triangles += (indexCount ?? positionCount) / 3;
    });

    expect(meshes.length).toBeLessThanOrEqual(CYBER_TRADER_CHARACTER_BUDGET.maxMeshes);
    expect(materials.size).toBeLessThanOrEqual(
      CYBER_TRADER_CHARACTER_BUDGET.maxMaterials
    );
    expect(triangles).toBeLessThanOrEqual(CYBER_TRADER_CHARACTER_BUDGET.maxTriangles);
    expect(character.getObjectByName('cyber-trader-visor')).not.toBeNull();
    expect(character.getObjectByName('cyber-trader-signal')).not.toBeNull();
  });

  it('recolors the shared signal material without rebuilding the character', () => {
    const character = createCyberTraderCharacter();
    const signal = character.getObjectByName('cyber-trader-signal');

    expect(signal).not.toBeNull();
    if (
      !(signal instanceof Mesh) ||
      !(signal.material instanceof MeshStandardMaterial)
    ) {
      throw new Error('cyber-trader signal must use a standard material');
    }

    const originalMaterial = signal.material;
    character.setSignalColor(0xff4d8d);

    expect(signal.material).toBe(originalMaterial);
    expect(signal.material.emissive.getHex()).toBe(0xff4d8d);
    expect(signal.material.color.getHex()).toBe(0xff4d8d);
  });

  it('keeps a readable top-down footprint at the player collision scale', () => {
    const character = createCyberTraderCharacter();
    const bounds = new Box3().setFromObject(character);
    const size = bounds.getSize(new Vector3());

    expect(size.x).toBeGreaterThanOrEqual(1.3);
    expect(size.z).toBeGreaterThanOrEqual(0.8);
  });
});
