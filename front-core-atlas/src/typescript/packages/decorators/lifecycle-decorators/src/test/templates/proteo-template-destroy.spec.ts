import { describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { ProteoTemplateDestroy, ProteoTemplateDestroyAsync } from '../../templates/proteo-template-destroy';

describe('Proteo Template Destroy Decorator', () => {
  it('when it is created, should return the decorator function', () => {
    expect(ProteoTemplateDestroy()).toBeInstanceOf(Function);
    expect(ProteoTemplateDestroyAsync()).toBeInstanceOf(Function);
  });

  it('when it is called, should print a log', () => {
    const spy = jest.fn();
    LoggerUtils.prototype.trace = spy;
    const decoratorInstance = ProteoTemplateDestroy();
    decoratorInstance({}, '', {});
    expect(spy).toHaveBeenCalled();
  });
});
