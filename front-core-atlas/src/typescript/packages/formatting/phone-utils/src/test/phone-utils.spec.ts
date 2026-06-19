import type { CountriesList } from '@proteo/types';
import { getCountries, getCountryByCode, getCountryByDialCode } from '../phone-utils.js';
import { I18n } from '@proteo/i18n-utils';

describe('Phone Utils', () => {
  it('should return the full list of country codes with the new key name with the translated country name value', () => {
    expect.assertions(2);
    const fullList: CountriesList = getCountries();
    expect(fullList.countries.length).toBeGreaterThan(0);
    expect(fullList.countries[4].name).toBe('AmericanSamoa');
  });

  it('should return the full list of country codes with the new key name with the translated country name value and ordered by local language', () => {
    expect.assertions(2);
    I18n.getInstance().use('es_ES');
    const fullList: CountriesList = getCountries();
    expect(fullList.countries.length).toBeGreaterThan(0);
    expect(fullList.countries[4].name).toBe('Andorra');
  });

  it('should return the translated name of a country given the country dial code', () => {
    expect.assertions(1);
    expect(getCountryByDialCode('+34')).toBe('España');
  });

  it('should return the translated name of a country given the country phone number code', () => {
    expect.assertions(1);
    expect(getCountryByCode('ES')).toBe('España');
  });
});
