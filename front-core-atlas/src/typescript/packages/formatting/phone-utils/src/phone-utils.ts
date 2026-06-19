import { I18n } from '@proteo/i18n-utils';
import type { CommonCountry, CountriesList } from '@proteo/types';
import CommonCountries from './phoneCommon/index.js';

/**
 * Gets the full list of countries
 *
 * @returns object with the new key 'name' that contains the country name translated
 */
export const getCountries = (): CountriesList => {
  const fullList: CountriesList = { countries: [] };
  CommonCountries.common.countries.forEach((country: CommonCountry, i: number) => {
    fullList.countries[i] = {
      code: country.code,
      dial: country.dial,
      name: country[I18n.getInstance()?.language as keyof CommonCountry]
    };
  });
  fullList.countries.sort((a, b) => a.name.localeCompare(b.name));
  return fullList;
};

/**
 * Gets the Country name translated for a phone number code given
 *
 * @param dialCode code for country (+34 for Spain, +33 for France)
 * @returns string with the translated name of the country
 */
export const getCountryByDialCode = (dialCode: string): string => {
  let countryName = '';
  const country = CommonCountries.common.countries.find(
    (commonCountry: CommonCountry) => commonCountry.dial === dialCode
  );
  if (country) {
    countryName = country[I18n.getInstance().language as keyof CommonCountry];
  }
  return countryName;
};

/**
 * Gets the Country name translated for country code
 *
 * @param code phone number code of a country (ES for Spain, FR for France)
 * @returns string with the translated name of the country
 */
export const getCountryByCode = (code: string): string => {
  let countryName = '';
  const country = CommonCountries.common.countries.find((commonCountry: CommonCountry) => commonCountry.code === code);
  if (country) {
    countryName = country[I18n.getInstance().language as keyof CommonCountry];
  }
  return countryName;
};
