import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SamlManagerService } from '@proteo/saml-manager';
import { SamlLoaderComponent } from '../../shared/loader.component';
import { buildSamlManagerConfig } from '@app/saml-flow/domain/constants/global.constants';

@Component({
  selector: 'saml-response',
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
export class SamlResponseComponent implements OnInit {
  loading: WritableSignal<boolean> = signal(true);

  private route       = inject(ActivatedRoute);
  private samlManager = inject(SamlManagerService);

  ngOnInit(): void {
    this.samlManager.setConfig(buildSamlManagerConfig());

    // ⚠️ LIMITACIÓN CONOCIDA: PingAM entrega SAMLResponse/RelayState vía POST de
    // formulario (llamada 4) hacia esta ruta. Angular Router solo lee la URL
    // (path/query/fragment), no el body de la petición que cargó el documento.
    // Para que estos valores lleguen aquí como query params, el servidor que sirve
    // index.html en la ACS URL de NEO debe re-emitirlos en la URL de retorno
    // (PENDIENTE "ACS URL de NEO en config de Shell", context-SAML.md secc. 14).
    const samlResponse = this.route.snapshot.queryParamMap.get('SAMLResponse');
    const relayState   = this.route.snapshot.queryParamMap.get('RelayState');

    if (samlResponse && relayState) {
      this.samlManager.submitSamlResponse(samlResponse, relayState); // llamada 5 — Angular abandona contexto
    } else {
      // Caso alternativo (sección 6): SSO Cookie inválida/ausente → saml:unauthorized
      this.samlManager.notifyUnauthorized();
      this.loading.set(false);
    }
  }
}
