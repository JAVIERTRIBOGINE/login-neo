import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'neo-landing',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  private readonly router = inject(Router);

  startResourcesFlow(): void {
    void this.router.navigate(['/saml/resources']);
  }
}
