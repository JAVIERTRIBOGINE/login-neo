import { deepEquals } from '../deep-equals.js';

describe('Deep Equals', () => {
  it('same objects must be equals', () => {
    expect.assertions(1);
    const obj1 = {
      stringKey: 'test',
      numberKey: 5,
      arrayKey: ['test', 'otherTest'],
      deepObject: {
        arrayDeep: [{ test: 'test' }]
      }
    };
    const obj2 = { ...obj1 };
    expect(deepEquals(obj1, obj2)).toBe(true);
  });

  it('objects with different keys must not be equals', () => {
    expect.assertions(1);
    const obj1 = {
      stringKey: 'test',
      numberKey: 5,
      arrayKey: ['test', 'otherTest'],
      deepObject: {
        arrayDeep: [{ test: 'test' }]
      }
    };
    const obj2 = { ...obj1 };
    obj2.deepObject = {
      arrayDeep: [{ test: 'otherTest' }]
    };
    expect(deepEquals(obj1, obj2)).toBe(false);
  });

  it('NaN should be equals NAN', () => {
    expect.assertions(1);
    expect(deepEquals(NaN, NaN)).toBe(true);
  });

  it('value vs null should be not equals', () => {
    expect(deepEquals(3, null)).toBe(false);
  });

  it('array vs object should be not equals', () => {
    expect.assertions(2);
    expect(deepEquals(['test'], { test: 'test' })).toBe(false);
    expect(deepEquals({ test: 'test' }, ['test'])).toBe(false);
  });

  it('two arrays with the same value should be equals', () => {
    expect.assertions(1);
    expect(deepEquals(['test', 'otherTest'], ['test', 'otherTest'])).toBe(true);
  });

  it('two object with the same key subset but one of them with extra keys should not be equals', () => {
    expect.assertions(2);
    const obj1 = {
      key1: 'test',
      key2: 'otherTest'
    };
    const obj2 = {
      key1: 'test',
      key2: 'otherTest',
      key3: 'Exclusive Key test'
    };
    expect(deepEquals(obj1, obj2)).toBe(false);
    expect(deepEquals(obj2, obj1)).toBe(false);
  });
});
