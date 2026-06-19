import { EnumEnvironments } from '@proteo/types';

export const getEnvironment = (link?: string): EnumEnvironments => {
  const href = link ? link : window.location.origin;

  // Localhost consideration
  if (href.indexOf('localhost') > -1) {
    return EnumEnvironments.INT;
  }

  // regex expression escape character
  // eslint-disable-next-line no-useless-escape
  const regex = /https?:\/\/[^\/]*\.(pre|int)\./i;

  const matches = href.match(regex);
  return matches ? (matches[1].toUpperCase() as EnumEnvironments) : EnumEnvironments.PRO;
};
