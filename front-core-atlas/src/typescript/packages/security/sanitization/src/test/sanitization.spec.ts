import { sanitizeDOMString, sanitizeElementsAttributes } from '..';

describe('Sanitization Utils', () => {
  it('filter onerror', () => {
    expect(sanitizeDOMString('<img src="x" onerror="alert(document.cookie);">')).toEqual('<img src="x">');
  });

  it('filter onclick', () => {
    expect(sanitizeDOMString('<button id="myButton" name="myButton" onclick="alert(document.cookie);">harmless button</button>')).toEqual(
      '<button id="myButton" name="myButton">harmless button</button>'
    );
  });

  it('filter <a> href JS', () => {
    expect(sanitizeDOMString('<a href="javascript:alert(document.cookie)">harmless link</a>')).toEqual('<a>harmless link</a>');
  });

  it('filter <a> href JS + class attribute', () => {
    expect(sanitizeDOMString('<a class="link" href="Javascript&#58;alert(document.cookie)">harmless link</a>')).toEqual(
      '<a class="link">harmless link</a>'
    );
  });

  it('filter <iframe>', () => {
    expect(sanitizeDOMString('<iframe src="javascript:alert(document.cookie)"></iframe>')).toEqual('');
  });

  it('filter href + javascript ', () => {
    expect(sanitizeDOMString('<div><button><a href="javascript:alert(document.cookie)">click me</a></button></div>')).toEqual(
      '<div><button><a>click me</a></button></div>'
    );
  });

  it('filter <object>', () => {
    expect(sanitizeDOMString('<object><img src="x" onerror="alert(document.cookie);"></object>')).toEqual('');
  });

  it('sanitizeDOMString with custom tags', () => {
    expect(sanitizeDOMString('<bs-item><bs-label>Hello!</bs-label><bs-button onclick="alert(document.cookie);">Click me</bs-button>')).toEqual(
      '<bs-item><bs-label>Hello!</bs-label><bs-button>Click me</bs-button></bs-item>'
    );
  });

  it('sanitize null element must not throw any error', () => {
    expect(() => sanitizeElementsAttributes(null)).not.toThrow();
  });

  it('sanitizeDOMString empty must return an empty string', () => {
    expect(sanitizeDOMString('')).toEqual('');
  });
});
