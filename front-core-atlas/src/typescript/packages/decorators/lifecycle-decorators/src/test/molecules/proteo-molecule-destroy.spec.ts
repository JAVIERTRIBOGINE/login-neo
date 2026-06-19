import { describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { ProteoMoleculeDestroy, ProteoMoleculeDestroyAsync } from '../../molecules/proteo-molecule-destroy';

describe('Proteo Molecule Destroy Decorator', () => {
  it('when it is created, should return the decorator function', () => {
    expect(ProteoMoleculeDestroy()).toBeInstanceOf(Function);
    expect(ProteoMoleculeDestroyAsync()).toBeInstanceOf(Function);
  });

  it('when it is called, should print a log', () => {
    const spy = jest.fn();
    LoggerUtils.prototype.trace = spy;
    const decoratorInstance = ProteoMoleculeDestroy();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });
});
