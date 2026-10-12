import {
  BoxGeometry,
  ConeGeometry,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  type ColorRepresentation,
} from 'three';

export const CYBER_TRADER_CHARACTER_BUDGET = Object.freeze({
  maxMeshes: 8,
  maxMaterials: 6,
  maxTriangles: 6000,
});

export const CYBER_TRADER_LONG_SIGNAL = 0x20e7ff;
export const CYBER_TRADER_SHORT_SIGNAL = 0xff4d8d;

const CYBER_NAVY = 0x0b1730;
const CYBER_PURPLE = 0x7c2bd1;
const CYBER_PURPLE_ACCENT = 0xb43cff;
const CYBER_SKIN = 0xf1b28b;
const CYBER_SIGNAL = CYBER_TRADER_LONG_SIGNAL;

const createMaterial = (
  color: ColorRepresentation,
  roughness = 0.72,
  metalness = 0.16
): MeshStandardMaterial =>
  new MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });

const createSignalMaterial = (color: ColorRepresentation): MeshStandardMaterial =>
  new MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 2.1,
    roughness: 0.28,
    metalness: 0.08,
  });

export class CyberTraderCharacter extends Mesh<BoxGeometry, MeshStandardMaterial> {
  private readonly signalMaterial: MeshStandardMaterial;

  public constructor(signalColor: ColorRepresentation = CYBER_SIGNAL) {
    super(new BoxGeometry(0.9, 0.92, 0.7), createMaterial(CYBER_PURPLE));
    this.name = 'cyber-trader-body';
    this.geometry.translate(0, 0.52, 0);

    const shoulderMaterial = createMaterial(CYBER_PURPLE_ACCENT, 0.62, 0.22);
    const navyMaterial = createMaterial(CYBER_NAVY, 0.82, 0.12);
    const skinMaterial = createMaterial(CYBER_SKIN, 0.88, 0.04);
    const hairMaterial = createMaterial(CYBER_PURPLE_ACCENT, 0.58, 0.18);
    this.signalMaterial = createSignalMaterial(signalColor);

    const shoulders = new Mesh(new BoxGeometry(1.34, 0.36, 0.84), shoulderMaterial);
    shoulders.name = 'cyber-trader-shoulders';
    shoulders.position.y = 0.88;

    const legs = new Mesh(new BoxGeometry(0.7, 0.76, 0.58), navyMaterial);
    legs.name = 'cyber-trader-legs';
    legs.position.y = 0.02;

    const boots = new Mesh(new BoxGeometry(0.92, 0.22, 0.82), navyMaterial);
    boots.name = 'cyber-trader-boots';
    boots.position.set(0, -0.35, -0.04);

    const head = new Mesh(new IcosahedronGeometry(0.31, 1), skinMaterial);
    head.name = 'cyber-trader-head';
    head.position.y = 1.28;

    const hair = new Mesh(new ConeGeometry(0.39, 0.34, 6), hairMaterial);
    hair.name = 'cyber-trader-hair';
    hair.position.set(0, 1.57, -0.02);
    hair.rotation.y = Math.PI / 6;

    const visor = new Mesh(new BoxGeometry(0.72, 0.14, 0.18), this.signalMaterial);
    visor.name = 'cyber-trader-visor';
    visor.position.set(0, 1.3, -0.24);

    const signal = new Mesh(new BoxGeometry(0.18, 0.06, 0.6), this.signalMaterial);
    signal.name = 'cyber-trader-signal';
    signal.position.set(0, 1.03, 0);

    this.add(shoulders, legs, boots, head, hair, visor, signal);
  }

  public setSignalColor(color: ColorRepresentation): void {
    this.signalMaterial.color.set(color);
    this.signalMaterial.emissive.set(color);
  }
}

export const createCyberTraderCharacter = (
  signalColor?: ColorRepresentation
): CyberTraderCharacter => new CyberTraderCharacter(signalColor);
