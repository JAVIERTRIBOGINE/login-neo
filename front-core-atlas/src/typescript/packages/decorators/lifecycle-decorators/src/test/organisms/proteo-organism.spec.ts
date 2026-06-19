import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { ProteoOrganism, ProteoOrganismAsync } from '../../organisms/proteo-organism';

describe('Proteo Organism Decorator', () => {
  const spy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    LoggerUtils.prototype.trace = spy;
  });

  it('when it is created, should return the decorator function', () => {
    expect(ProteoOrganism()).toBeInstanceOf(Function);
    expect(ProteoOrganismAsync()).toBeInstanceOf(Function);
  });

  it('when it is called, should print a log', () => {
    const decoratorInstance = ProteoOrganism();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });

  it('when it is called in an async way, should print a log', () => {
    const decoratorInstance = ProteoOrganismAsync();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });
});
