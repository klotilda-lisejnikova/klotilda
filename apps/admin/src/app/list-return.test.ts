import { describe, expect, it } from 'vitest';
import { listReturn } from './list-return';

const nameOf = (path: string) => (path.startsWith('/products/') ? 'product' : 'products');

describe('listReturn', () => {
  it('goes back to the list as it was left', () => {
    expect(listReturn('/products?status=hidden', nameOf, 'products')).toBe(
      '/products?status=hidden'
    );
  });

  it('goes to the plain list from anywhere else', () => {
    expect(listReturn('/products/prod1', nameOf, 'products')).toEqual({ name: 'products' });
    expect(listReturn(null, nameOf, 'products')).toEqual({ name: 'products' });
  });
});
