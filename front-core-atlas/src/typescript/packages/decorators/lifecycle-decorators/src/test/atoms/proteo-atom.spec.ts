import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { ProteoAtom, ProteoAtomAsync } from '../../atoms/proteo-atom';

describe('Proteo Atom Decorator', () => {
  const spy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    LoggerUtils.prototype.trace = spy;
  });

  it('when it is created, should return the decorator function', () => {
    expect(ProteoAtom()).toBeInstanceOf(Function);
    expect(ProteoAtomAsync()).toBeInstanceOf(Function);
  });

  it('when it is called, should print a log', () => {
    expect.assertions(1);
    const decoratorInstance = ProteoAtom();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });

  it('when it is called in an async way, should print a log', () => {
    expect.assertions(1);
    const decoratorInstance = ProteoAtomAsync();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });
});
