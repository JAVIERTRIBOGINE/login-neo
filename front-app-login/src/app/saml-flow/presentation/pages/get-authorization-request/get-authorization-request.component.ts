import { Component, OnInit, inject, signal } from '@angular/core';
import { buildSamlManagerConfig } from '@app/saml-flow/domain/constants/global.constants';
import { SamlLoaderComponent } from '../../shared/loader.component';
import { RedirectHandlerComponent } from '../../shared/redirect-handler.component';
import { SamlRuntimeConfigService } from '@app/saml-flow/application/services/saml-runtime-config.service';
import { FlowConfirmationModalService } from '@app/login/application/services/flow-confirmation-modal.service';

@Component({
  selector: 'get-authorization-request',
  standalone: true,
  imports: [RedirectHandlerComponent, SamlLoaderComponent],
  template: `
    <saml-loader></saml-loader>
    @if (authnRequestUrl(); as url) {
      <saml-redirect-handler
        [url]="url"
        [method]="authnRequestMethod()">
      </saml-redirect-handler>
    }
  `,
})
export class GetAuthorizationRequestComponent implements OnInit {
  private readonly runtimeConfig = inject(SamlRuntimeConfigService);
  private readonly flowConfirmation = inject(FlowConfirmationModalService);
  readonly authnRequestUrl = signal<string | null>(null);
  readonly authnRequestMethod = signal<'GET' | 'POST'>('GET');

  async ngOnInit(): Promise<void> {
    const config = buildSamlManagerConfig(await this.runtimeConfig.whenReady());
    await this.flowConfirmation.confirm({
      title: 'Paso SAML: authnRequest y redirección PingAM',
      description: `${config.authnRequestMethod} ${config.endpoints.authnRequest}. Angular inicia la AuthnRequest contra NetScaler; el navegador recibe y sigue la redirección 302 hacia PingAM.`,
    });
    this.authnRequestMethod.set(config.authnRequestMethod);
    this.authnRequestUrl.set(config.endpoints.authnRequest);
  }
}
