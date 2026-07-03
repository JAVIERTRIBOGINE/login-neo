import { Injectable } from '@angular/core';
import { SamlShellConfig } from '@app/saml-flow/domain/models/saml-shell-config.model';

@Injectable({ providedIn: 'root' })
export class SamlRuntimeConfigService {
  private config?: SamlShellConfig;
  private resolveConfig!: (config: SamlShellConfig) => void;
  private rejectConfig!: (error: Error) => void;
  private readonly configPromise = new Promise<SamlShellConfig>((resolve, reject) => {
    this.resolveConfig = resolve;
    this.rejectConfig = reject;
  });

  setConfig(config: SamlShellConfig): void {
    this.config = config;
    window.NEO_LOGIN_SAML_CONFIG = config;
    this.resolveConfig(config);
  }

  setMissingConfigError(): void {
    this.rejectConfig(new Error('La Shell no ha proporcionado SAML_CONFIG al Login MFE'));
  }

  whenReady(): Promise<SamlShellConfig> {
    if (this.config) return Promise.resolve(this.config);
    if (window.NEO_LOGIN_SAML_CONFIG) {
      this.setConfig(window.NEO_LOGIN_SAML_CONFIG);
      return Promise.resolve(window.NEO_LOGIN_SAML_CONFIG);
    }
    return this.configPromise;
  }
}
