/**
 *
 * @param obj Any object for create deep copy all properties
 * @returns Return deep copy of the original object
 */
export function deepClone(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  if (obj instanceof Array) {
    const arrCopy: any[] = [];
    for (const item of obj) {
      arrCopy.push(deepClone(item));
    }
    return arrCopy;
  }
  if (obj instanceof Object) {
    const objCopy: { [key: string]: any } = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        objCopy[key] = deepClone(obj[key]);
      }
    }
    return objCopy;
  }
  // If the object is not a special type (Date, Array, Object), return it as is
  return obj;
}
