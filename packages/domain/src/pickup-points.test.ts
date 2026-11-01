import { describe, expect, it } from 'vitest';
import {
  formatPickupPointAddress,
  PICKUP_POINT_ID_PATTERN,
  resolvePickupNetwork,
} from './pickup-points';

describe('pickup points', () => {
  it('send a delivery with a network to its points, never a pickup', () => {
    expect(resolvePickupNetwork({ kind: 'delivery', pickupNetwork: 'packeta' })).toBe('packeta');
    expect(resolvePickupNetwork({ kind: 'delivery', pickupNetwork: null })).toBeNull();
    expect(resolvePickupNetwork({ kind: 'delivery' })).toBeNull();
    expect(resolvePickupNetwork({ kind: 'pickup', pickupNetwork: 'packeta' })).toBeNull();
  });

  it('take only digits as a point id, up to the stored length', () => {
    expect(PICKUP_POINT_ID_PATTERN.test('1234')).toBe(true);
    expect(PICKUP_POINT_ID_PATTERN.test('1'.repeat(20))).toBe(true);
    expect(PICKUP_POINT_ID_PATTERN.test('1'.repeat(21))).toBe(false);
    expect(PICKUP_POINT_ID_PATTERN.test('12a')).toBe(false);
    expect(PICKUP_POINT_ID_PATTERN.test('')).toBe(false);
  });

  it('write an address as one line, leaving out what is missing', () => {
    expect(formatPickupPointAddress({ street: 'Dlouhá 12', zip: '110 00', city: 'Praha ' })).toBe(
      'Dlouhá 12, 110 00 Praha'
    );
    expect(formatPickupPointAddress({ street: null, zip: '', city: 'Praha' })).toBe('Praha');
    expect(formatPickupPointAddress({})).toBe('');
  });
});
