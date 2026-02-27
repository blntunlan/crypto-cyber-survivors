/**
 * UnifiedDirector Tests - Rule Based AI Director
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  UnifiedDirector,
  type UnifiedInputs,
} from '../../../services/difficulty/UnifiedDirector';

describe('UnifiedDirector', () => {
  beforeEach(() => {
    UnifiedDirector.reset();
  });

  const createDefaultInputs = (): UnifiedInputs => ({
    rsi: 0.5,
    rsiMomentum: 0,
    atrPercent: 0.02,
    volumeNorm: 0.5,
    priceChange: 0,
    trendStrength: 0.5,
    hpPercent: 1.0,
    pnlRatio: 0,
    killsPerMin: 0.5,
    dashFrequency: 0.1,
    playerDPS: 0.5,
    damageTakenRate: 0,
    elapsedMinutes: 1,
    playerLevel: 1,
    leverage: 0.1,
    gemPileup: 0,
    engagementScore: 0.5,
    frustrationScore: 0,
  });

  describe('Initialization', () => {
    it('should be a singleton', () => {
      expect(UnifiedDirector).toBeDefined();
    });

    it('should have default outputs', () => {
      const outputs = UnifiedDirector.getOutputs();
      expect(outputs.spawnRate).toBe(1.0);
      expect(outputs.enemySpeed).toBe(1.0);
      expect(outputs.mercyFactor).toBe(0);
    });
  });

  describe('Mercy System', () => {
    it('should trigger mercy when HP is low and damage rate is high', () => {
      const inputs = createDefaultInputs();
      inputs.hpPercent = 0.1; // 10% HP
      inputs.damageTakenRate = 0.8; // Taking lots of damage

      // Update multiple times to move through smoothing
      for (let i = 0; i < 100; i++) {
        UnifiedDirector.update(inputs, i * 100);
      }

      const outputs = UnifiedDirector.getOutputs();
      expect(outputs.mercyFactor).toBeGreaterThan(0);
      expect(outputs.spawnRate).toBeLessThan(2.0); // Mercy should reduce it
    });
  });

  describe('Market Influence', () => {
    it('should increase spawn rate with volume', () => {
      const inputsLow = createDefaultInputs();
      inputsLow.volumeNorm = 0.1;

      const inputsHigh = createDefaultInputs();
      inputsHigh.volumeNorm = 0.9;

      UnifiedDirector.reset();
      for (let i = 0; i < 100; i++) UnifiedDirector.update(inputsLow, i * 100);
      const lowOut = UnifiedDirector.getOutputs().spawnRate;

      UnifiedDirector.reset();
      for (let i = 0; i < 100; i++) UnifiedDirector.update(inputsHigh, i * 100);
      const highOut = UnifiedDirector.getOutputs().spawnRate;

      expect(highOut).toBeGreaterThan(lowOut);
    });

    it('should increase enemy speed with volatility (ATR)', () => {
      const inputsLow = createDefaultInputs();
      inputsLow.atrPercent = 0.01;

      const inputsHigh = createDefaultInputs();
      inputsHigh.atrPercent = 0.08;

      UnifiedDirector.reset();
      for (let i = 0; i < 100; i++) UnifiedDirector.update(inputsLow, i * 100);
      const lowOut = UnifiedDirector.getOutputs().enemySpeed;

      UnifiedDirector.reset();
      for (let i = 0; i < 100; i++) UnifiedDirector.update(inputsHigh, i * 100);
      const highOut = UnifiedDirector.getOutputs().enemySpeed;

      expect(highOut).toBeGreaterThan(lowOut);
    });
  });

  describe('Leverage Impact', () => {
    it('should penalize high leverage with harder enemies', () => {
      const inputsLow = createDefaultInputs();
      inputsLow.leverage = 0.1;

      const inputsHigh = createDefaultInputs();
      inputsHigh.leverage = 1.0; // 100x

      UnifiedDirector.reset();
      for (let i = 0; i < 100; i++) UnifiedDirector.update(inputsLow, i * 100);
      const lowOut = UnifiedDirector.getOutputs();

      UnifiedDirector.reset();
      for (let i = 0; i < 100; i++) UnifiedDirector.update(inputsHigh, i * 100);
      const highOut = UnifiedDirector.getOutputs();

      expect(highOut.spawnRate).toBeGreaterThan(lowOut.spawnRate);
      expect(highOut.enemyDamage).toBeGreaterThan(lowOut.enemyDamage);
    });
  });

  describe('Smoothing', () => {
    it('should approach target values gradually', () => {
      const inputs = createDefaultInputs();
      inputs.volumeNorm = 1.0;

      UnifiedDirector.update(inputs, 100);
      const firstOut = UnifiedDirector.getOutputs().spawnRate;

      UnifiedDirector.update(inputs, 200);
      const secondOut = UnifiedDirector.getOutputs().spawnRate;

      expect(secondOut).toBeGreaterThan(firstOut);
      expect(secondOut).toBeLessThan(5.0); // Should not jump to max immediately
    });
  });
});
