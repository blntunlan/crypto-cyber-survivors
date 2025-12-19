/**
 * MilestoneService Tests
 *
 * Tests for milestone service public API.
 * Note: Singleton pattern makes full integration testing complex.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MilestoneService } from '../services/MilestoneService';

describe('MilestoneService', () => {
    beforeEach(() => {
        MilestoneService.reset();
    });

    describe('session management', () => {
        it('should start a session without throwing', () => {
            expect(() => MilestoneService.startSession()).not.toThrow();
        });

        it('should reset all milestones', () => {
            MilestoneService.startSession();
            MilestoneService.reset();
            expect(MilestoneService.getTotalKills()).toBe(0);
            expect(MilestoneService.getAchievedMilestones()).toEqual([]);
        });
    });

    describe('public API', () => {
        it('should return 0 kills initially', () => {
            MilestoneService.reset();
            expect(MilestoneService.getTotalKills()).toBe(0);
        });

        it('should return empty array for achieved milestones initially', () => {
            MilestoneService.reset();
            const achieved = MilestoneService.getAchievedMilestones();
            expect(Array.isArray(achieved)).toBe(true);
            expect(achieved.length).toBe(0);
        });

        it('should not throw when checking time milestones before session start', () => {
            MilestoneService.reset();
            expect(() => MilestoneService.checkTimeMilestones()).not.toThrow();
        });

        it('should not throw when checking time milestones with active session', () => {
            MilestoneService.startSession();
            expect(() => MilestoneService.checkTimeMilestones()).not.toThrow();
        });
    });
});
