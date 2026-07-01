import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, OnDestroy, WritableSignal, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { OauthManagerService, SamlManagerService, SAML_MANAGER_EVENTS, SamlManagerEvent } from '@proteo/auth-manager';
import { SamlLoaderComponent } from '../../shared/loader.component';
import { buildSamlManagerConfig } from '@app/saml-flow/domain/constants/global.constants';
import { Router } from '@angular/router';
import { SAML_ROUTE_DATA } from '@app/saml-flow/domain/constants/path.constant';
import { FlowConfirmationModalService } from '@app/login/application/services/flow-confirmation-modal.service';
import { SamlRuntimeConfigService } from '@app/saml-flow/application/services/saml-runtime-config.service';
import { SamlManagerConfig } from '@proteo/auth-manager';

@Component({
  selector: 'saml-resources',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, SamlLoaderComponent],
  template: `
    <bs-section style="margin: 0 auto">
      @if (loading()) {
        <saml-loader></saml-loader>
      }
    </bs-section>
  `,
})
export class ResourcesComponent implements OnInit, OnDestroy {
  loading: WritableSignal<boolean> = signal(true);

  private samlManager = inject(SamlManagerService);
  private oauthManager = inject(OauthManagerService);
  private router = inject(Router);
  private flowConfirmation = inject(FlowConfirmationModalService);
  private runtimeConfig = inject(SamlRuntimeConfigService);
  private samlSub!: Subscription;
  private config!: SamlManagerConfig;

  async ngOnInit(): Promise<void> {
    this.samlSub = this.samlManager.events$.subscribe(event => this.handleEvent(event));
    const shellConfig = await this.runtimeConfig.whenReady();
    this.config = buildSamlManagerConfig(shellConfig);
    this.samlManager.setConfig({
      ...this.config,
      confirmStep: step => this.flowConfirmation.confirm(step),
    });
    this.samlManager.checkResources(); // cubre llamadas 1 (primera vez) y 6 (retorno tras NetScaler)
  }

  private handleEvent(event: SamlManagerEvent): void {
    switch (event.type) {
      case SAML_MANAGER_EVENTS.SAML_SUCCESS:
        // saml:success ya publicado por SamlManagerService — fin del flujo
        this.loading.set(false);
        this.oauthManager.completeSamlAuthorization(event.payload);
        break;
      case SAML_MANAGER_EVENTS.AUTHN_REQUEST:
        this.oauthManager.requireSamlAuthorization({
          authnRequestUrl: this.config.endpoints.authnRequest,
          method: this.config.authnRequestMethod,
        });
        this.router.navigate([SAML_ROUTE_DATA.AUTHORIZATION_REQUEST]);
        break;
      case SAML_MANAGER_EVENTS.SAML_ERROR:
        // saml:error ya publicado por SamlManagerService
        this.loading.set(false);
        this.oauthManager.failSamlAuthorization(event.payload);
        break;
      case SAML_MANAGER_EVENTS.SAML_UNAUTHORIZED:
        // Exclusivo de ACSComponent — no se emite desde checkResources()
        break;
    }
  }

  ngOnDestroy(): void {
    this.samlSub?.unsubscribe();
  }
}
