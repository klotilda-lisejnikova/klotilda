import { describe, expect, it } from 'vitest';
import { PACKETA_VALIDATE_URL } from '@klotilda/domain';
import { createPacketaValidator, PickupPointsUnavailable } from './pickup-points';

const API_KEY = 'abcdef0123456789';

/** A stand-in for `fetch` answering `body` with `status`, and recording what it was sent. */
function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

const validAnswer = (group = '') => ({
  isValid: true,
  point: {
    name: 'Praha 4, Budějovická 1667/64 (Albert)',
    address: { street: 'Budějovická 1667/64', city: 'Praha ', zip: '140 00', country: 'cz' },
    group,
  },
  errors: [],
});

describe('Packeta validator', () => {
  it('asks about the point with the key, the country and the vendors the map offers', async () => {
    const { calls, fetchImpl } = fakeFetch(200, validAnswer());
    const validate = createPacketaValidator({ apiKey: API_KEY, fetch: fetchImpl });

    expect(await validate('packeta', '1234')).toEqual({
      pickupPointId: '1234',
      pickupPointName: 'Praha 4, Budějovická 1667/64 (Albert)',
      pickupPointAddress: 'Budějovická 1667/64, 140 00 Praha',
      pickupPointType: 'point',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(PACKETA_VALIDATE_URL);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      apiKey: API_KEY,
      point: { id: '1234' },
      options: { country: 'cz', vendors: [{ country: 'cz' }, { country: 'cz', group: 'zbox' }] },
    });
  });

  it('knows a Z-BOX by its group', async () => {
    const { fetchImpl } = fakeFetch(200, validAnswer('zbox'));
    const validate = createPacketaValidator({ apiKey: API_KEY, fetch: fetchImpl });
    expect(await validate('packeta', '5678')).toMatchObject({ pickupPointType: 'box' });
  });

  it("passes on Packeta's refusal with its reasons", async () => {
    const { fetchImpl } = fakeFetch(200, {
      isValid: false,
      point: { name: 'Z-BOX', group: 'zbox' },
      errors: [{ code: 'PickupPointIsFull', description: 'The pick-up point is full.' }],
    });
    const validate = createPacketaValidator({ apiKey: API_KEY, fetch: fetchImpl });
    expect(await validate('packeta', '1234')).toEqual({
      refused: true,
      reasons: ['PickupPointIsFull: The pick-up point is full.'],
    });
  });

  it('reads a refusal with odd errors, and cuts what the order could not store', async () => {
    for (const errors of ['boom', { a: 1 }, [null], undefined]) {
      const { fetchImpl } = fakeFetch(200, { isValid: false, errors });
      const validate = createPacketaValidator({ apiKey: API_KEY, fetch: fetchImpl });
      expect(await validate('packeta', '1234')).toEqual({ refused: true, reasons: [] });
    }
    const long = 'X'.repeat(300);
    const { fetchImpl } = fakeFetch(200, {
      isValid: true,
      point: { name: long, address: { street: long, city: 'Praha', zip: '110 00' } },
    });
    const point = await createPacketaValidator({ apiKey: API_KEY, fetch: fetchImpl })(
      'packeta',
      '1234'
    );
    expect(point).toMatchObject({ pickupPointName: 'X'.repeat(255) });
    expect('pickupPointAddress' in point && point.pickupPointAddress).toHaveLength(255);
  });

  it('is unavailable without a key, on an error status, an odd answer or no connection', async () => {
    const unavailable = expect.any(PickupPointsUnavailable);
    const noKey = createPacketaValidator({
      apiKey: undefined,
      fetch: fakeFetch(200, {}).fetchImpl,
    });
    await expect(noKey('packeta', '1234')).rejects.toEqual(unavailable);

    for (const [status, body] of [
      [401, { message: 'Invalid API key' }],
      [500, {}],
      [200, { point: {} }],
      [200, { isValid: true, point: {} }],
      [200, { isValid: true, point: null }],
      [200, null],
      [200, 'isValid'],
    ] as const) {
      const validate = createPacketaValidator({
        apiKey: API_KEY,
        fetch: fakeFetch(status, body).fetchImpl,
      });
      await expect(validate('packeta', '1234')).rejects.toEqual(unavailable);
    }

    const offline = createPacketaValidator({
      apiKey: API_KEY,
      fetch: (async () => {
        throw new TypeError('fetch failed');
      }) as typeof fetch,
    });
    await expect(offline('packeta', '1234')).rejects.toEqual(unavailable);
  });
});
