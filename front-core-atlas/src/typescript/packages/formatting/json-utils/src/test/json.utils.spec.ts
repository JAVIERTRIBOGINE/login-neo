import { getValue, setValue } from '../json-utils.js';

describe('json.utils', () => {
  const object = {
    a: {
      b: 'd',
      c: ['e', 'f'],
      ሀ: 'unicode key',
      'dot.dot': 'key'
    },
    1: 'one',
    2: { 3: 'three' },
    invalid: null,
    undefined: undefined,
    empty: {}
  };

  it('should return values for correct paths', async () => {
    expect(getValue(object, 'a.b')).toBe('d');
    expect(getValue(object, ['a', 'b'])).toBe('d');
    expect(getValue(object, ['a', 'dot.dot'])).toBe('key');
    expect(getValue(object, 'a.\u1200')).toBe('unicode key');
    expect(getValue(object, 1)).toBe('one');
    expect(getValue(object, [2, 3])).toBe('three');
  });

  it('should return array values for correct paths', async () => {
    expect(getValue(object, 'a.c.1')).toBe('f');
    expect(getValue(object, ['a', 'c', '1'])).toBe('f');
  });

  it('should return default values for nonexisting paths', async () => {
    expect(getValue(object, 'a.b.c', 'DEFAULT')).toBe('DEFAULT');
  });

  it('should not fail on invalid parameters or values', async () => {
    expect(getValue(object, '')).toBe(object);
    expect(getValue(null, 'a.b.c', 'DEFAULT')).toBe('DEFAULT');
    expect(getValue(object, 'invalid')).toBe(null);
    expect(getValue(object, 'empty')).toEqual({});
    expect(getValue(object, 'undefined')).toBeUndefined();
  });

  it('should set values for correct paths', async () => {
    setValue(object, 'invalid', 'invalid');
    expect(object.invalid).toBe('invalid');
    setValue(object, 'a.b', 'composed value');
    expect(object.a.b).toBe('composed value');
    const nullObject = null;
    expect(setValue(nullObject, 'a.b.c', 'Value')).toBe(nullObject);
    setValue(object, [2, 3], 'Three is 3');
    expect(object[2][3]).toBe('Three is 3');
    setValue(object, 1, 'One is 1');
    expect(object[1]).toBe('One is 1');
  });
});
