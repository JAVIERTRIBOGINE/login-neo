import { describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { ProteoOrganismDestroy, ProteoOrganismDestroyAsync } from '../../organisms/proteo-organism-destroy';

describe('Proteo Organism Destroy Decorator', () => {
  it('when it is created, should return the decorator function', () => {
    expect(ProteoOrganismDestroy()).toBeInstanceOf(Function);
    expect(ProteoOrganismDestroyAsync()).toBeInstanceOf(Function);
  });

  it('when it is called, should print a log', () => {
    const spy = jest.fn();
    LoggerUtils.prototype.trace = spy;
    const decoratorInstance = ProteoOrganismDestroy();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });
});
