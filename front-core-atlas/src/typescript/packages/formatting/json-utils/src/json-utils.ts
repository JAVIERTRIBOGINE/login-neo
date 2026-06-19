/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Returns the key or the integer key (for arrays)
 * @param key Object key
 */
const getKey = <T>(key: keyof T | string): keyof T | number => {
  const intKey = parseInt(String(key));
  if (intKey.toString() === key) {
    return intKey;
  }
  return key as keyof T;
};

/**
 * Returns if the object has a shallow property
 * @param object Object to analyze
 * @param property Property to find
 */
const hasShallowProperty = <T>(object: T, property: keyof T | number): boolean => {
  return (
    (typeof property === 'number' && Array.isArray(object)) || Object.prototype.hasOwnProperty.call(object, property)
  );
};

/**
 * Returns the shallow property if exists
 * @param object Object to analyze
 * @param property Property to find
 */
const getShallowProperty = <T>(object: T, property: keyof T | number): unknown => {
  if (hasShallowProperty<T>(object, property)) {
    if (Array.isArray(object)) {
      return object[property as number];
    }
    return object[property as keyof T];
  }
  return void 0;
};

/**
 * Sets the shallow property if exists
 * @param object Object to analyze
 * @param property Property to find
 * @param value Value to set
 */
const setShallowProperty = <T>(object: T, property: keyof T | number, value: T[keyof T]): void => {
  if (hasShallowProperty<T>(object, property)) {
    if (Array.isArray(object)) {
      object[property as number] = value;
    }
    object[property as keyof T] = value;
  }
};

type Path = string | number | string[] | number[];

/**
 * Returns the value of a json object based on a path
 * @param object JSON object to iterate
 * @param path JSON path
 * @param defaultValue default value for non-existing objects
 */
export const getValue = <T>(object: T, path: Path, defaultValue?: string): unknown => {
  if (typeof path === 'number') {
    path = [path];
  }
  if (!path || (Array.isArray(path) && path.length === 0)) {
    return object;
  }
  if (object == null) {
    return defaultValue;
  }
  if (typeof path === 'string') {
    return getValue(object, path.split('.'), defaultValue);
  }

  const currentPath = getKey((path as Array<keyof T | string>)[0]);
  const nextObj = getShallowProperty<T>(object, currentPath);
  if (nextObj === void 0) {
    return defaultValue;
  }
  if (path.length === 1) {
    return nextObj;
  }
  if (Array.isArray(object)) {
    return getValue(object[currentPath as number], path.slice(1), defaultValue);
  }
  return getValue(object[currentPath as keyof T], path.slice(1), defaultValue);
};

/**
 * Sets the value at path of json object
 * @param object JSON object to iterate
 * @param path JSON path
 * @param value the value to set
 */
export const setValue = <T>(object: T, path: Path, value: unknown): unknown => {
  if (typeof path === 'number') {
    path = [path];
  }
  if (!path || path.length === 0 || object == null) {
    return object;
  }
  if (typeof path === 'string') {
    return setValue(object, path.split('.'), value);
  }
  const currentPath = getKey((path as Array<keyof T | string>)[0]);
  if (path.length === 1) {
    setShallowProperty(object, currentPath, value as T[keyof T]);
    return object;
  }
  if (Array.isArray(object)) {
    return setValue(object[currentPath as number], path.slice(1), value);
  }
  return setValue(object[currentPath as keyof T], path.slice(1), value);
};
