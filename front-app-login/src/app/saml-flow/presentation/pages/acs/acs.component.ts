import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthManagerService } from '@proteo/auth-manager';
import { buildSamlManagerConfig } from '@app/saml-flow/domain/constants/global.constants';
import { AcsResponse } from '@app/saml-flow/domain/models/acs-response.model';
import { SamlLoaderComponent } from '../../shared/loader.component';
import { SamlFormComponent } from '../../shared/saml-form.component';
import { SamlRuntimeConfigService } from '@app/saml-flow/application/services/saml-runtime-config.service';
import { FlowConfirmationModalService } from '@app/login/application/services/flow-confirmation-modal.service';

@Component({
  selector: 'saml-acs',
  standalone: true,
  imports: [CommonModule, SamlFormComponent, SamlLoaderComponent],
  template: `
    @if (loading()) {
      <saml-loader></saml-loader>
    }
    @if (formParams(); as params) {
      @if (netscalerAcsUrl(); as action) {
        <saml-form [action]="action" method="POST" [params]="params"></saml-form>
      }
    }
  `,
})
export class ACSComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly authManager = inject(AuthManagerService);
  private readonly runtimeConfig = inject(SamlRuntimeConfigService);
  private readonly flowConfirmation = inject(FlowConfirmationModalService);

  readonly loading = signal(true);
  readonly formParams = signal<Record<string, string> | null>(null);
  readonly netscalerAcsUrl = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const config = buildSamlManagerConfig(await this.runtimeConfig.whenReady());
    this.netscalerAcsUrl.set(config.endpoints.netscalerAcs);
    const responseId = this.route.snapshot.queryParamMap.get('responseId');
    if (!responseId) {
      this.fail(new Error('Falta responseId en el retorno ACS'));
      return;
    }

    const url = `${config.endpoints.acsResponse}/${encodeURIComponent(responseId)}`;
    this.http.get<AcsResponse>(url, { withCredentials: true }).subscribe({
      next: response => void this.forwardSamlResponseToNetScaler(response, config.endpoints.netscalerAcs),
      error: error => this.fail(error),
    });
  }

  private async forwardSamlResponseToNetScaler(response: AcsResponse, netscalerAcsUrl: string): Promise<void> {
    await this.flowConfirmation.confirm({
      title: 'Paso SAML: validateSAMLResponse NetScaler',
      description: `NEO ha recuperado SAMLResponse y RelayState. Construye un formulario POST hacia ${netscalerAcsUrl}; el navegador lo enviará a NetScaler para validar la aserción y emitir la cookie Citrix.`,
    });

    this.formParams.set({
      SAMLResponse: response.samlResponse,
      RelayState: response.relayState,
    });
    this.loading.set(false);
  }

  private fail(error: unknown): void {
    this.authManager.failSamlAuthorization(error);
    this.loading.set(false);
  }
}
