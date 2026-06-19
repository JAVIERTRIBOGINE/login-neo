import { describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { ProteoAtomDestroy, ProteoAtomDestroyAsync } from '../../atoms/proteo-atom-destroy';

describe('Proteo Atom Destroy Decorator', () => {
  it('when it is created, should return the decorator function', () => {
    expect(ProteoAtomDestroy()).toBeInstanceOf(Function);
    expect(ProteoAtomDestroyAsync()).toBeInstanceOf(Function);
  });

  it('when it is called, should print a log', () => {
    const spy = jest.fn();
    LoggerUtils.prototype.trace = spy;
    const decoratorInstance = ProteoAtomDestroy();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });
});
