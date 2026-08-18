import { describe, expect, it } from 'vitest';
import {
  clampKcal,
  kcalToT,
  nearestTickLabel,
  positionedTicks,
  snapToTick,
  statusPillLabel,
  statusPillTone,
  stepKcal,
  tFromClientX,
  tToKcal,
} from './pace-slider-math';

describe('pace slider math', () => {
  it('clamps and rounds kcal', () => {
    expect(clampKcal(1100.4, 800, 2000)).toBe(1100);
    expect(clampKcal(700, 800, 2000)).toBe(800);
    expect(clampKcal(2500, 800, 2000)).toBe(2000);
  });

  it('inverts deficit tracks so lower kcal sits to the right', () => {
    expect(kcalToT(2000, 800, 2000, true)).toBe(0);
    expect(kcalToT(800, 800, 2000, true)).toBe(1);
    expect(tToKcal(0, 800, 2000, true)).toBe(2000);
    expect(tToKcal(1, 800, 2000, true)).toBe(800);
  });

  it('keeps surplus tracks low-to-high left-to-right', () => {
    expect(kcalToT(2000, 2000, 2600, false)).toBe(0);
    expect(tToKcal(1, 2000, 2600, false)).toBe(2600);
  });

  it('picks the nearest tick label', () => {
    const ticks = [
      { value: 2200, label: 'Gentle' },
      { value: 2000, label: 'Standard' },
      { value: 1800, label: 'Aggressive' },
    ];
    expect(nearestTickLabel(2010, ticks)).toBe('Standard');
    expect(nearestTickLabel(900, ticks)).toBe('Aggressive');
  });

  it('steps inverted tracks so ArrowRight lowers kcal', () => {
    expect(stepKcal(1700, 800, 2000, true, 1, 10)).toBe(1690);
    expect(stepKcal(1700, 800, 2000, true, -1, 10)).toBe(1710);
  });

  it('maps pointer clientX onto the track', () => {
    expect(tFromClientX(100, 100, 200)).toBe(0);
    expect(tFromClientX(200, 100, 200)).toBe(0.5);
    expect(tFromClientX(300, 100, 200)).toBe(1);
    expect(tFromClientX(50, 100, 200)).toBe(0);
    expect(tFromClientX(400, 100, 200)).toBe(1);
  });

  it('positions named ticks at their kcal, collapsing identical values', () => {
    const spread = positionedTicks(
      [
        { value: 2000, label: 'Gentle' },
        { value: 1600, label: 'Standard' },
        { value: 1500, label: 'Aggressive' },
      ],
      800,
      2000,
      true,
    );
    expect(spread.map((tick) => tick.t)).toEqual([
      0,
      kcalToT(1600, 800, 2000, true),
      kcalToT(1500, 800, 2000, true),
    ]);

    const collapsed = positionedTicks(
      [
        { value: 2500, label: 'Gentle' },
        { value: 2500, label: 'Standard' },
        { value: 2500, label: 'Aggressive' },
      ],
      2300,
      2700,
      false,
    );
    expect(collapsed).toEqual([
      { value: 2500, label: 'Standard', t: kcalToT(2500, 2300, 2700, false) },
    ]);
  });

  it('snaps onto a tick within 1.8% of the track span', () => {
    const ticks = [
      { value: 2200, label: 'Gentle' },
      { value: 2000, label: 'Standard' },
      { value: 1800, label: 'Aggressive' },
    ];
    // span 1400 → threshold 25.2
    expect(snapToTick(2010, ticks, 800, 2200)).toBe(2000);
    expect(snapToTick(1810, ticks, 800, 2200)).toBe(1800);
    expect(snapToTick(1900, ticks, 800, 2200)).toBe(1900);
    expect(snapToTick(700, ticks, 800, 2200)).toBe(800);
    expect(snapToTick(2010, [], 800, 2200)).toBe(2010);
  });

  it('builds a single status-pill label from warning + tick', () => {
    expect(statusPillLabel('floor', 'Aggressive', false)).toBe('Below calorie floor');
    expect(statusPillLabel('beyond', 'Aggressive', false)).toBe('Aggressive · Beyond recommended');
    expect(statusPillLabel('custom', 'Standard', false)).toBe('Custom pace');
    expect(statusPillLabel('none', 'Standard', true)).toBe('Standard · Suggested');
    expect(statusPillLabel('none', 'Gentle', false)).toBe('Gentle');
    expect(statusPillTone('floor')).toBe('alert');
    expect(statusPillTone('beyond')).toBe('milestone');
    expect(statusPillTone('custom')).toBe('neutral');
    expect(statusPillTone('none')).toBe('accent');
  });
});
