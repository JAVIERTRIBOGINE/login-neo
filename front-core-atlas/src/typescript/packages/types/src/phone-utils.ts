/**
 * CountriesList object
 * Full object to be sent to the application with the country names already translated
 */
export type CountriesList = {
  countries: Array<Country>;
};

/**
 * Country object
 */
export type Country = {
  code: string;
  dial: string;
  name: string;
};

/**
 * CommonCountry object
 * Object type for the common document data phoneCommon/common.json
 */
export type CommonCountry = {
  code: string;
  dial: string;
  ca_ES: string;
  de_DE: string;
  en_GB: string;
  es_ES: string;
  eu_ES: string;
  fr_FR: string;
  gl_ES: string;
  va_ES: string;
};
