import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SAML_ROUTE_DATA } from '@app/saml-flow/domain/constants/path.constant';
import { SamlLoaderComponent } from '../../shared/loader.component';

@Component({
  selector: 'saml-start',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, SamlLoaderComponent],
  template: `
    <bs-section style="margin: 0 auto">
      <saml-loader></saml-loader>
    </bs-section>
  `,
})
export class SamlStartComponent implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {
    this.router.navigate([SAML_ROUTE_DATA.RESOURCES]);
  }
}
