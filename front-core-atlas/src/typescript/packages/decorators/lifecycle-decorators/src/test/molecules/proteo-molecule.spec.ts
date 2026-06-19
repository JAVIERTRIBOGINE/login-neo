import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { ProteoMolecule, ProteoMoleculeAsync } from '../../molecules/proteo-molecule';

describe('Proteo Molecule Decorator', () => {
  const spy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    LoggerUtils.prototype.trace = spy;
  });

  it('when it is created, should return the decorator function', () => {
    expect(ProteoMolecule()).toBeInstanceOf(Function);
    expect(ProteoMoleculeAsync()).toBeInstanceOf(Function);
  });

  it('when it is called, should print a log', () => {
    const decoratorInstance = ProteoMolecule();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });

  it('when it is called in an async way, should print a log', () => {
    const decoratorInstance = ProteoMoleculeAsync();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });
});
