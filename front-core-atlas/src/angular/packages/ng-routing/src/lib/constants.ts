export const AUTH_DEFAULT_PATHS = {
    LOGIN_PATH: '/auth/new-login'
}

export const CTA_ACTION_MAP = {
    'openInAppURL': {
      method: 'openInAppURL',
      event: 'OPEN_IN_APP_URL'
    },
    'openBrowserURL': {
      method: 'openBrowserURL',
      event: 'OPEN_BROWSER_URL'
    },
    'deepLink': {
      method: 'openUniversalLink',
      event: 'OPEN_UNIVERSAL_LINK'
    },
    'default': {
      method: 'openOperative',
      event: 'OPEN_OPERATIVE',
    }
};