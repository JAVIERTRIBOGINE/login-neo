import { Component, Input, OnInit } from '@angular/core';
import { SamlFormComponent } from './saml-form.component';

@Component({
  selector: 'saml-redirect-handler',
  standalone: true,
  imports: [SamlFormComponent],
  template: `
    @if (method === 'POST') {
      <saml-form [action]="url" method="POST" [params]="params"></saml-form>
    }
  `,
})
export class RedirectHandlerComponent implements OnInit {
  @Input({ required: true }) url = '';
  @Input() method: 'GET' | 'POST' = 'GET';
  @Input() params: Record<string, string> = {};

  ngOnInit(): void {
    /*
     * Si Citrix/back confirma POST para /authnRequest:
     * - opcion corta: cambiar AUTHN_REQUEST_METHOD a POST y enviar un form vacio autoenviado.
     * - opcion larga: anadir params configurables si /authnRequest exige campos hidden.
     */
    if (this.method === 'GET') window.location.assign(this.url);
  }
}
