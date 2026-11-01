import { describe, expect, it } from 'vitest';
import { pickupPointFor } from './shipping-methods';

const POINT = {
  pickupPointId: '1234',
  pickupPointName: 'Praha 1, Dlouhá 12',
  pickupPointAddress: 'Dlouhá 12, 110 00 Praha',
  pickupPointType: 'point' as const,
};
const METHOD_CHANGED = { statusCode: 400, message: 'Tento způsob dopravy už není v nabídce' };

describe('pickupPointFor', () => {
  it('passes the checked point on while the locked method still sends to points', () => {
    expect(pickupPointFor('packeta', POINT)).toBe(POINT);
    expect(pickupPointFor(null, undefined)).toBeUndefined();
  });

  it('refuses the order when the method changed between the check and the lock', () => {
    expect(() => pickupPointFor('packeta', undefined)).toThrow(
      expect.objectContaining(METHOD_CHANGED)
    );
    expect(() => pickupPointFor(null, POINT)).toThrow(expect.objectContaining(METHOD_CHANGED));
  });
});
