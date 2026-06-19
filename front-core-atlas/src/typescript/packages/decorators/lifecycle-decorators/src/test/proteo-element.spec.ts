import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { ProteoElement, ProteoElementAsync } from '../proteo-element';

describe('Proteo Element Decorator', () => {
  const spy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    LoggerUtils.prototype.trace = spy;
  });

  it('when it is created, should return the decorator function', () => {
    expect(ProteoElement()).toBeInstanceOf(Function);
    expect(ProteoElementAsync()).toBeInstanceOf(Function);
  });

  it('when it is called, should print a log', () => {
    const decoratorInstance = ProteoElement();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });

  it('when it is called in an async way, should print a log', () => {
    const decoratorInstance = ProteoElementAsync();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });
});
