/**
 * Determines if two objects or two values are equivalent.
 *
 * Two objects or values are considered equivalent if at least one of the following is true:
 *
 * * Both objects or values pass `===` comparison.
 * * Both objects or values are of the same type and all of their properties are equal by
 *   comparing them with `equals`.
 *
 * @param o1 Object or value to compare.
 * @param o2 Object or value to compare.
 * @returns true if arguments are equal.
 */

export const deepEquals = (o1: unknown, o2: unknown): boolean => {
  if (simpleEquality(o1, o2)) {
    return true;
  }
  if (anyIsNull(o1, o2)) {
    return false;
  }
  if (bothAreObjects(o1, o2)) {
    return objectDeepEquals(o1, o2);
  }
  return false;
};

const simpleEquality = (o1: unknown, o2: unknown) => {
  return o1 === o2 || bothAreNaN(o1, o2);
};

const anyIsNull = (o1: unknown, o2: unknown) => {
  return o1 === null || o2 === null;
};

const bothAreNaN = (o1: unknown, o2: unknown) => {
  return o1 !== o1 && o2 !== o2;
};

const bothAreObjects = (o1: unknown, o2: unknown) => {
  return typeof o1 === 'object' && typeof o2 === 'object';
};

const objectDeepEquals = (o1: unknown, o2: unknown): boolean => {
  if (Array.isArray(o1)) {
    if (!Array.isArray(o2)) {
      return false;
    }
    return arrayDeepEquals(o1, o2);
  } else {
    if (Array.isArray(o2)) {
      return false;
    }
    return notArrayDeepEquals(o1 as Record<string, unknown>, o2 as Record<string, unknown>);
  }
};

const arrayDeepEquals = <T>(o1: Array<T>, o2: Array<T>) => {
  if (o1.length === o2.length) {
    for (let i = 0; i < o1.length; i++) {
      if (!deepEquals(o1[i], o2[i])) {
        return false;
      }
    }
    return true;
  }
  return false;
};

const notArrayDeepEquals = <T extends Record<string, unknown>>(o1: T, o2: T): boolean => {
  const keySet: Record<string, boolean> = Object.create(null);
  for (const key in o1) {
    if (Object.prototype.hasOwnProperty.call(o1, key)) {
      if (!deepEquals(o1[key], o2[key])) {
        return false;
      }
      keySet[key] = true;
    }
  }
  return validateAgainstKeyset(o2, keySet);
};

const validateAgainstKeyset = (o: Record<string, unknown>, keySet: Record<string, boolean>) => {
  for (const key in o) {
    if (!(key in keySet) && typeof o[key] !== 'undefined') {
      return false;
    }
  }
  return true;
};
