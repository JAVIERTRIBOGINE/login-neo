import type { DataErrorCodeZ } from './types/index.js';
import { ProteoErrorEnum, ProteoErrorKeyMap } from '@proteo/error-management-utils';

const ERROR_CODE_SHORT_LENGTH = 5;
const ERROR_CODE_LONG_LENGTH = 6;

/**
 * Possible Z code lengths constant
 */
export const LENGTHS_OPTIONS = [ERROR_CODE_SHORT_LENGTH, ERROR_CODE_LONG_LENGTH];

/**
 * Checks if text value contain errorCodeZ
 * @param text string that can contain errorCodeZ
 * @returns boolean specifying if the errorCodeZ is present or not
 */
export const checkErrorCodeZ = (text: string): boolean => {
  const textFragments: string[] = text?.split('.');
  const zCode: string = textFragments && textFragments[textFragments.length - 1];

  return !!(zCode?.length && LENGTHS_OPTIONS.includes(zCode.length) && zCode[0] === 'Z' && !isNaN(+zCode.substr(1)));
};

/**
 * Split text value and returns errorCodeZ and cleaned text
 * @param text string that contains Z error
 * @returns object with the text and errorCodeZ into separated properties
 */
export const getErrorCodeZ = (text: string): DataErrorCodeZ => {
  if (checkErrorCodeZ(text)) {
    const textFragments: string[] = text.split('.');
    const zCode: string[] = textFragments.splice(textFragments.length - 1, 1);

    return { text: textFragments.join('.') + '.', zCode: zCode[0] };
  } else {
    throw new Error(`ERROR retrieving the Z code from the text: ${text}`);
  }
};

/**
 * Returns ProteoError corresponding to given string message key
 * @param errorMsgKey error message key to find the corresponding ProteoError
 * @returns the corresponding ProteoError to the given errorMsgKey or the generic one if not found
 */
export const getProteoErrorByMsg = (errorMsgKey: string): ProteoErrorEnum => {
  return (
    (Object.keys(ProteoErrorKeyMap) as ProteoErrorEnum[]).find((key: ProteoErrorEnum) => {
      const definedKeys: string[] | undefined = ProteoErrorKeyMap[key];
      return definedKeys?.some((definedKey) => errorMsgKey.includes(definedKey));
    }) || ProteoErrorEnum.GENERIC_ERROR
  );
};
