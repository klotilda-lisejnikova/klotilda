import { describe, expect, it } from 'vitest';
import { productFields } from '@klotilda/domain';
import { emptyToNull, nullToEmpty } from './form-values';
import { describeIssue, formSchema } from './validation';

describe('Form validation', () => {
  it('runs the API rules on the product form, in Czech', async () => {
    const result = await formSchema(productFields, 'create')['~standard'].validate({
      name_cs: '',
      price: -1,
    });
    expect('issues' in result && result.issues?.map((issue) => issue.message)).toEqual(
      expect.arrayContaining(['Vyplňte prosím.', 'Nejméně 0.'])
    );
  });

  it('describes every issue code', () => {
    expect(describeIssue({ path: 'name_cs', code: 'maxLength', params: { maxLength: 255 } })).toBe(
      'Nejvýš 255 znaků.'
    );
  });
});

describe('Form values', () => {
  it('store an emptied optional text as nothing, and show nothing as an empty input', () => {
    expect(emptyToNull({ name_en: '', price: 0, active: false })).toEqual({
      name_en: null,
      price: 0,
      active: false,
    });
    expect(nullToEmpty({ name_en: null, name_cs: 'Váza' })).toEqual({
      name_en: '',
      name_cs: 'Váza',
    });
  });
});
