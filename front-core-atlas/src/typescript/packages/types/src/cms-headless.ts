export enum CMSHeadlessContentPaths {
  Literal = 'literal'
}

export interface CMSHeadlessLiteralFields {
  title: string;
  description: string;
}

export interface ICMSHeadless {
  fetchLocalizedContent(flag: string, lang: string, path: CMSHeadlessContentPaths): Promise<unknown>;
}

export interface CMSHeadlessConfig {
  ACTIVATED: boolean;
  ENDPOINT: string;
  TOKEN?: string;
}
