import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';

import { ResourcesService } from '../../services/resources.service';

declare global {
  interface Window {
    NEO_SHELL?: boolean;
  }
}

@Component({
  selector: 'neo-shell-root',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, RouterLink, RouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.scss',
})
export class ShellLayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly resources = inject(ResourcesService);
  private readonly subscriptions = new Subscription();

  readonly menu$ = this.resources.menu$;

  ngOnInit(): void {
    window.NEO_SHELL = true;
    window.addEventListener('proteoEventBusPublish', this.handleProteoEvent);
  }

  ngOnDestroy(): void {
    window.removeEventListener('proteoEventBusPublish', this.handleProteoEvent);
    delete window.NEO_SHELL;
    this.subscriptions.unsubscribe();
  }

  private readonly handleProteoEvent = (event: Event): void => {
    const detail = (event as CustomEvent<{ topic?: string; payload?: unknown }>).detail;
    const topic = detail?.topic ?? '';

    if (topic.includes('AUTHN_REQUEST')) {
      this.resources.clearMenu();
      void this.router.navigate(['/login']);
      return;
    }

    if (topic.includes('SAML_SUCCESS')) {
      const subscription = this.resources.loadMenu().subscribe({
        next: () => void this.router.navigate(['/']),
        error: () => void this.router.navigate(['/']),
      });
      this.subscriptions.add(subscription);
    }
  };
}
