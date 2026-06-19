import type { BaseAppConfig, CMSHeadlessContentPaths } from '@proteo/types';
import { CmsHeadless } from '../cms-headless.js';
import { describe, expect, it, jest } from '@jest/globals';
import { mocked } from 'jest-mock';
import { LoggerUtils } from '@proteo/logger-utils';

type MockFetchResponse = {
  ok: boolean;
  statusText?: string;
  json?: () => Promise<any>;
};

const CONFIG = {
  CMS_HEADLESS_CONFIG: {
    ENDPOINT: 'test-endpoint'
  }
};

describe('cms-headless', () => {
  beforeAll(() => {
    // @ts-ignore consent fetch in globals
    global.fetch = jest.fn();
  });
  beforeEach(() => {
    mocked(fetch).mockClear();
  });

  it('Should get global instance of Feature Manager', () => {
    const spy = jest.spyOn(CmsHeadless, 'initInstance');
    CmsHeadless.getInstance();
    expect(spy).toBeCalled();
  });

  it('Should try create instance without config', () => {
    new CmsHeadless();
    const spy = jest.fn();
    LoggerUtils.prototype.debug = spy;
    expect(spy).toHaveBeenCalledTimes(0);
  });

  it('fetches localized content successfully', async () => {
    await CmsHeadless.initInstance(CONFIG as BaseAppConfig);
    const mockResponse: MockFetchResponse = {
      ok: true,
      json: () => Promise.resolve({ data: 'Contenido localizado' })
    };

    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

    const instance = CmsHeadless.getInstance();
    const content = await instance.fetchLocalizedContent('/fake-path' as CMSHeadlessContentPaths, 'es-ES');

    expect(content).toEqual({ data: 'Contenido localizado' });
  });
  it('handle fetch error', async () => {
    CmsHeadless.initInstance(CONFIG as BaseAppConfig);
    (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Failed to fetch'));

    const instance = CmsHeadless.getInstance();

    await expect(instance.fetchLocalizedContent('/fake-path' as CMSHeadlessContentPaths, 'es-ES')).rejects.toThrow('Failed to fetch');
  });
  it('Handle non-successful response', async () => {
    CmsHeadless.initInstance(CONFIG as BaseAppConfig);

    // Mock de la respuesta de fetch
    const mockResponse = {
      ok: false,
      statusText: 'Not Found',
      json: jest.fn(() => Promise.resolve({ message: 'Error message' }))
    };

    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

    const instance = CmsHeadless.getInstance();

    // Intenta ejecutar fetchLocalizedContent y espera que se rechace con el error esperado
    await expect(instance.fetchLocalizedContent('/fake-path' as CMSHeadlessContentPaths, 'es-ES')).rejects.toThrow(
      'Error fetching localized content: Not Found'
    );
  });
});
