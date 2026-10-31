import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, PNG_SIGNATURE, startTestApp } from './test-support/test-app';
import type { TestApp } from './test-support/test-app';

const VASE = { name_cs: 'Váza', price: 1200 };

describe('Products and the gallery', () => {
  let app: TestApp;
  let token: string;
  /** The migration creates the first categories. */
  let ceramicsId: string;

  beforeAll(async () => {
    app = await startTestApp();
    token = await app.signInAdmin();
    const categories = await app.api().get('/api/categories');
    ceramicsId = categories.body.data.find(
      (category: { slug: string }) => category.slug === 'keramika'
    ).id;
  });

  const createCategory = (body: object) =>
    app.api().post('/api/categories').set('Authorization', bearer(token)).send(body);

  afterAll(async () => {
    await app?.close();
  });

  const createProduct = async (body: object) => {
    const response = await app
      .api()
      .post('/api/products')
      .set('Authorization', bearer(token))
      .send(body);
    expect(response.status).toBe(201);
    return response.body as { id: string };
  };

  it('lets only a signed-in admin write', async () => {
    expect((await app.api().post('/api/products').send(VASE)).status).toBe(401);
    const product = await createProduct(VASE);
    expect((await app.api().patch(`/api/products/${product.id}`).send({ price: 1 })).status).toBe(
      401
    );
    expect((await app.api().delete(`/api/products/${product.id}`)).status).toBe(401);
  });

  it("shows visitors only what's on offer, and the admin everything", async () => {
    const hidden = await createProduct({ ...VASE, name_cs: 'Skrytá', active: false });

    const publicList = await app.api().get('/api/products').query({ limit: 200 });
    expect(publicList.status).toBe(200);
    const publicIds = publicList.body.data.map((product: { id: string }) => product.id);
    expect(publicIds).not.toContain(hidden.id);
    expect((await app.api().get(`/api/products/${hidden.id}`)).status).toBe(404);
    expect((await app.api().get('/api/products').query({ active: false })).body.data).toEqual([]);

    const adminList = await app
      .api()
      .get('/api/products')
      .query({ limit: 200 })
      .set('Authorization', bearer(token));
    expect(adminList.body.data.map((product: { id: string }) => product.id)).toContain(hidden.id);
  });

  it('checks fields by the shared rules', async () => {
    const response = await app
      .api()
      .post('/api/products')
      .set('Authorization', bearer(token))
      .send({ name_cs: 'Tričko', price: -5 });
    expect(response.status).toBe(400);
    expect(response.body.issues).toEqual([expect.objectContaining({ path: 'price', code: 'min' })]);

    const unknownCategory = await app
      .api()
      .post('/api/products')
      .set('Authorization', bearer(token))
      .send({ ...VASE, categoryId: 'cat_missing' });
    expect(unknownCategory.status).toBe(400);
    expect(unknownCategory.body.issues).toEqual([
      expect.objectContaining({ path: 'categoryId', code: 'reference' }),
    ]);
  });

  it('returns each product with its category', async () => {
    const product = await createProduct({ ...VASE, categoryId: ceramicsId });
    const read = await app.api().get(`/api/products/${product.id}`);
    expect(read.body.category).toEqual({
      id: ceramicsId,
      slug: 'keramika',
      name_cs: 'Keramika',
      name_en: 'Ceramics',
      sortOrder: 0,
    });
    const filtered = await app.api().get('/api/products').query({ categoryId: ceramicsId });
    expect(filtered.body.data.map((row: { id: string }) => row.id)).toContain(product.id);
    const without = await createProduct(VASE);
    expect((await app.api().get(`/api/products/${without.id}`)).body.category).toBeNull();
  });

  it('lets the admin add categories, with a plain slug', async () => {
    expect((await app.api().post('/api/categories').send({ slug: 'x', name_cs: 'X' })).status).toBe(
      401
    );
    const created = await createCategory({ slug: 'Síťované Ubrusy', name_cs: 'Síťované ubrusy' });
    expect(created.status).toBe(201);
    expect(created.body.slug).toBe('sitovane-ubrusy');

    const duplicate = await createCategory({ slug: 'sitovane-ubrusy', name_cs: 'Znovu' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.issues).toEqual([
      expect.objectContaining({ path: 'slug', code: 'unique' }),
    ]);
    const empty = await createCategory({ slug: '—', name_cs: 'Nic' });
    expect(empty.status).toBe(400);
    expect(empty.body.issues).toEqual([expect.objectContaining({ path: 'slug', code: 'format' })]);

    const renamed = await app
      .api()
      .patch(`/api/categories/${created.body.id}`)
      .set('Authorization', bearer(token))
      .send({ slug: 'Ubrusy ' });
    expect(renamed.body.slug).toBe('ubrusy');
  });

  it('refuses to delete a category that still holds something, and deletes an empty one', async () => {
    const category = (await createCategory({ slug: 'podsedaky', name_cs: 'Podsedáky' })).body;
    const product = await createProduct({ ...VASE, categoryId: category.id });
    const del = () =>
      app.api().delete(`/api/categories/${category.id}`).set('Authorization', bearer(token));

    expect((await del()).status).toBe(409);
    await app
      .api()
      .patch(`/api/products/${product.id}`)
      .set('Authorization', bearer(token))
      .send({ categoryId: null });
    expect((await del()).status).toBe(204);
  });

  it('attaches photos, and removes them with the product', async () => {
    const product = await createProduct(VASE);
    const upload = await app
      .api()
      .post('/api/files')
      .set('Authorization', bearer(token))
      .field('refType', 'Product')
      .field('refId', product.id)
      .field('role', 'image')
      .attach('file', PNG_SIGNATURE, { filename: 'vaza.png', contentType: 'image/png' });
    expect(upload.status).toBe(201);

    const read = await app.api().get(`/api/products/${product.id}`);
    expect(read.body.images).toHaveLength(1);
    expect(read.body.images[0].id).toBe(upload.body.id);

    expect(
      (await app.api().delete(`/api/products/${product.id}`).set('Authorization', bearer(token)))
        .status
    ).toBe(204);
    expect((await app.api().get(`/api/files/${upload.body.id}`)).status).toBe(404);
  });

  const uploadPhoto = async (refType: string, refId: string) => {
    const response = await app
      .api()
      .post('/api/files')
      .set('Authorization', bearer(token))
      .field('refType', refType)
      .field('refId', refId)
      .field('role', 'image')
      .attach('file', PNG_SIGNATURE, { filename: 'x.png', contentType: 'image/png' });
    expect(response.status).toBe(201);
    return response.body.id as string;
  };

  const orderPhotos = (productId: string, ids: unknown, signedIn = true) => {
    const request = app.api().put(`/api/products/${productId}/images/order`);
    if (signedIn) request.set('Authorization', bearer(token));
    return request.send({ ids });
  };

  it("reorders a product's photos, and only all of them", async () => {
    const product = await createProduct(VASE);
    const [first, second, third] = [
      await uploadPhoto('Product', product.id),
      await uploadPhoto('Product', product.id),
      await uploadPhoto('Product', product.id),
    ];
    const elsewhere = await uploadPhoto('Product', (await createProduct(VASE)).id);

    expect((await orderPhotos(product.id, [third, first, second])).status).toBe(204);
    const read = await app.api().get(`/api/products/${product.id}`);
    expect(read.body.images.map((image: { id: string }) => image.id)).toEqual([
      third,
      first,
      second,
    ]);

    expect((await orderPhotos(product.id, [third, first, second], false)).status).toBe(401);
    expect((await orderPhotos(product.id, [first, second])).status).toBe(409);
    expect((await orderPhotos(product.id, [first, second, elsewhere])).status).toBe(409);
    expect((await orderPhotos(product.id, [first, first, second])).status).toBe(400);
    expect((await orderPhotos(product.id, 'nope')).status).toBe(400);
    expect((await orderPhotos('prod_missing', [first])).status).toBe(404);
  });

  it('refuses uploads from visitors and outside the shop', async () => {
    const product = await createProduct(VASE);
    const anonymous = await app
      .api()
      .post('/api/files')
      .field('refType', 'Product')
      .field('refId', product.id)
      .field('role', 'image')
      .attach('file', PNG_SIGNATURE, { filename: 'x.png', contentType: 'image/png' });
    expect(anonymous.status).toBe(401);

    const elsewhere = await app
      .api()
      .post('/api/files')
      .set('Authorization', bearer(token))
      .field('refType', 'Order')
      .field('refId', 'ord_1')
      .field('role', 'image')
      .attach('file', PNG_SIGNATURE, { filename: 'x.png', contentType: 'image/png' });
    expect(elsewhere.status).toBe(403);
  });

  it("lets a second admin manage the first one's photos", async () => {
    const product = await createProduct(VASE);
    const upload = await app
      .api()
      .post('/api/files')
      .set('Authorization', bearer(token))
      .field('refType', 'Product')
      .field('refId', product.id)
      .field('role', 'image')
      .attach('file', PNG_SIGNATURE, { filename: 'x.png', contentType: 'image/png' });
    const other = await app.signInAdmin('second@klotilda.test');
    expect(
      (await app.api().delete(`/api/files/${upload.body.id}`).set('Authorization', bearer(other)))
        .status
    ).toBe(204);
  });

  it('lists the gallery row by row, in the order set', async () => {
    const create = (body: object) =>
      app.api().post('/api/gallery').set('Authorization', bearer(token)).send(body);
    await create({ title_cs: 'B', row: 2, sortOrder: 0 });
    await create({ title_cs: 'A2', row: 1, sortOrder: 2 });
    await create({ title_cs: 'A1', row: 1, sortOrder: 1 });
    await create({ title_cs: 'Skrytá', row: 1, sortOrder: 0, active: false });
    expect((await create({ title_cs: 'C', row: 3 })).status).toBe(400);

    const list = await app.api().get('/api/gallery');
    expect(list.body.data.map((item: { title_cs: string }) => item.title_cs)).toEqual([
      'A1',
      'A2',
      'B',
    ]);
    expect(list.body.data[0].images).toEqual([]);
  });

  it('reorders a gallery row, and only all of it', async () => {
    const create = async (body: object) => {
      const response = await app
        .api()
        .post('/api/gallery')
        .set('Authorization', bearer(token))
        .send(body);
      return response.body.id as string;
    };
    const rowOf = async (row: number) =>
      (await app.api().get('/api/gallery').set('Authorization', bearer(token))).body.data
        .filter((item: { row: number }) => item.row === row)
        .map((item: { id: string }) => item.id);
    const orderRow = (row: number | string, ids: unknown, signedIn = true) => {
      const request = app.api().put(`/api/gallery/rows/${row}/order`);
      if (signedIn) request.set('Authorization', bearer(token));
      return request.send({ ids });
    };

    await create({ title_cs: 'Druhá řada', row: 2 });
    const row1 = await rowOf(1);
    const hidden = await create({ title_cs: 'Nová skrytá', row: 1, sortOrder: 0, active: false });
    const reversed = [hidden, ...row1].reverse();

    expect((await orderRow(1, reversed)).status).toBe(204);
    expect(await rowOf(1)).toEqual(reversed);

    expect((await orderRow(1, reversed, false)).status).toBe(401);
    expect((await orderRow(1, row1)).status).toBe(409);
    expect((await orderRow(1, [...reversed, ...(await rowOf(2))])).status).toBe(409);
    expect((await orderRow(1, [...reversed, reversed[0]])).status).toBe(400);
    expect((await orderRow(3, reversed)).status).toBe(404);
    expect((await orderRow('x', reversed)).status).toBe(404);
  });
});
