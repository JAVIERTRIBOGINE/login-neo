import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, OnDestroy, WritableSignal, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { SamlManagerService, SAML_MANAGER_EVENTS, SamlManagerEvent } from '@proteo/saml-manager';
import { SamlLoaderComponent } from '../../shared/loader.component';
import { buildSamlManagerConfig } from '@app/saml-flow/domain/constants/global.constants';

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
  private samlSub!: Subscription;

  ngOnInit(): void {
    this.samlSub = this.samlManager.events$.subscribe(event => this.handleEvent(event));
    this.samlManager.setConfig(buildSamlManagerConfig());
    this.samlManager.checkResources(); // cubre llamadas 1 (primera vez) y 6 (retorno tras NetScaler)
  }

  private handleEvent(event: SamlManagerEvent): void {
    switch (event.type) {
      case SAML_MANAGER_EVENTS.SAML_SUCCESS:
        // saml:success ya publicado por SamlManagerService — fin del flujo
        this.loading.set(false);
        break;
      case SAML_MANAGER_EVENTS.AUTHN_REQUEST:
        // 401 en /resources: el manager navega al flujo OAuth/login.
        break;
      case SAML_MANAGER_EVENTS.SAML_ERROR:
        // saml:error ya publicado por SamlManagerService
        this.loading.set(false);
        break;
      case SAML_MANAGER_EVENTS.SAML_UNAUTHORIZED:
        // Exclusivo de SamlResponseComponent — no se emite desde checkResources()
        break;
    }
  }

  ngOnDestroy(): void {
    this.samlSub?.unsubscribe();
  }
}
