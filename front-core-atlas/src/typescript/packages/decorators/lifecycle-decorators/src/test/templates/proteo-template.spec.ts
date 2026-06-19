import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { ProteoTemplate, ProteoTemplateAsync } from '../../templates/proteo-template';

describe('Proteo Template Decorator', () => {
  const spy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    LoggerUtils.prototype.trace = spy;
  });

  it('when it is created, should return the decorator function', () => {
    expect(ProteoTemplate()).toBeInstanceOf(Function);
    expect(ProteoTemplateAsync()).toBeInstanceOf(Function);
  });

  it('when it is called, should print a log', () => {
    const decoratorInstance = ProteoTemplate();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });

  it('when it is called in an async way, should print a log', () => {
    const decoratorInstance = ProteoTemplateAsync();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });
});
