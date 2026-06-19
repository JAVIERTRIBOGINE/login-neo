import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';

@Component({
  selector: 'saml-loader',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule],
  template: `
    @if (!isNeoShell()) {
      <bs-loading></bs-loading>
    }
  `,
})
export class SamlLoaderComponent {
  isNeoShell(): boolean {
    return Boolean((window as Window & { NEO_SHELL?: boolean }).NEO_SHELL);
  }
}
