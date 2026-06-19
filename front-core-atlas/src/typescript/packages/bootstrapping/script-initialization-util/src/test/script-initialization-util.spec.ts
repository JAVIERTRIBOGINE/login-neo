import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { appendElementScript } from '../script-initialization-util';

describe('script-initialization-util', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should append script element to head', () => {
    expect.assertions(1);

    const scriptElement = document.createElement('script');
    scriptElement.src = 'https://example.com/script.js';

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const appendChildSpy = jest.spyOn(document.head!, 'appendChild');

    appendElementScript(scriptElement);

    expect(appendChildSpy).toHaveBeenCalledWith(scriptElement);
  });

  it('should call onLoadFunction after script is loaded', () => {
    expect.assertions(1);

    const scriptElement = document.createElement('script');
    scriptElement.src = 'https://example.com/script.js';
    const onLoadFunction = jest.fn();

    appendElementScript(scriptElement, onLoadFunction);

    // Simulate script onload event
    scriptElement.dispatchEvent(new Event('load'));

    expect(onLoadFunction).toHaveBeenCalled();
  });

  it('should throw an error when the script id is already added', () => {
    expect.assertions(2);

    const scriptElement = document.createElement('script');
    scriptElement.id = 'testScript';
    scriptElement.type = 'text/javascript';
    scriptElement.src = 'https://example.com/script.js';

    const spy = jest.fn();
    LoggerUtils.prototype.error = spy;

    appendElementScript(scriptElement);
    appendElementScript(scriptElement).catch(() => '');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      '[Script Initialization util] The ID of the element you want to add is already added',
      {
        remoteLogger: true,
        type: 'application'
      }
    );
  });

  it('should throw a log error when no HEAD tag is present in the document', () => {
    expect.assertions(2);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).document.getElementsByTagName = jest.fn().mockReturnValue(false);

    const scriptElement = document.createElement('script');
    scriptElement.id = 'noHead';
    scriptElement.type = 'text/javascript';
    scriptElement.src = 'https://example.com/script.js';

    const spy = jest.fn();
    LoggerUtils.prototype.error = spy;

    appendElementScript(scriptElement).catch(() => '');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      '[Script Initialization util] No script was added because of no script tag HEAD existing',
      {
        remoteLogger: true,
        type: 'application'
      }
    );
  });
});
