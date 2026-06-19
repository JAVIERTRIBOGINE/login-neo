/**
 * Utils functions for Proteo4 sanitization
 * It is based on Ionic Sanitization utils
 * @see https://github.com/ionic-team/ionic-framework/blob/master/core/src/utils/sanitization/index.ts
 */

const blockedTags = ['script', 'style', 'iframe', 'meta', 'link', 'object', 'embed'];

const galateaAllowedAttributes = [
  'bs-aria-described-by',
  'bs-aria-description',
  'bs-aria-has-popup',
  'bs-aria-hidden',
  'bs-aria-label',
  'bs-aria-labelled-by',
  'bs-icon-aria-hidden',
  'bs-icon-aria-label',
  'bs-tab-index',
  'icon-name',
  'icon-position',
  'icon-size',
  'icon-type',
  'link-title',
  'rel',
  'target',
  'bs-role',
  'currency',
  'decimal-digits',
  'income',
  'language',
  'masked',
  'period',
  'show-code',
  'show-symbol',
  'strikethrough',
  'value',
  'mask-text',
  'mask-type',
  'skeleton',
  'bs-title-aria-level',
  'feedback-type',
  'size',
  'type'
];

const allowedAttributes = ['class', 'id', 'href', 'src', 'name', 'slot', ...galateaAllowedAttributes];

/**
 * Removes all attributes that could be used to inject JavaScript. modifies the current element instance
 * @param element the parent element to be sanitized
 */
export const sanitizeElementsAttributes = (element: Element | null): void => {
  if (element) {
    for (let i = 0; i < element.attributes.length; i++) {
      const attribute = element.attributes.item(i) as Attr;
      const attributeName = attribute.name;
      if (
        !allowedAttributes.includes(attributeName.toLowerCase()) ||
        (attribute.value != null && attribute.value.toLowerCase().includes('javascript:'))
      ) {
        element.removeAttribute(attributeName);
      }
    }

    for (let i = 0; i < element.children.length; i++) {
      sanitizeElementsAttributes(element.children.item(i));
    }
  }
};

/**
 * Does a simple sanitization of all elements in an untrusted string
 * @param untrustedString the string containing the DOM elements to be sanitized
 * @returns the string removing all untrusted DOM elements in the input string
 */
export const sanitizeDOMString = (untrustedString: string): string => {
  if (!untrustedString) return '';
  const documentFragment = document.createDocumentFragment();
  const workingDiv = document.createElement('div');
  documentFragment.appendChild(workingDiv);
  workingDiv.innerHTML = untrustedString;

  const untrustedElements = documentFragment.querySelectorAll(blockedTags.join(','));
  untrustedElements.forEach((el) => (el.parentNode as Node).removeChild(el));

  sanitizeElementsAttributes(workingDiv);

  return workingDiv.innerHTML;
};
