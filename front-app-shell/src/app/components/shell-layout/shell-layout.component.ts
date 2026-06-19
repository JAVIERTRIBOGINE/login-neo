import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  FlowTraceService,
  FlowTraceStep,
  NEO_FLOW_STEP_EVENT,
  NEO_FLOW_STEP_NEXT_EVENT,
} from '../../services/flow-trace.service';
import { ResourcesService } from '../../services/resources.service';

declare global {
  interface Window {
    NEO_SHELL?: boolean;
  }
}

@Component({
  selector: 'neo-shell-root',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, RouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.scss',
})
export class ShellLayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly resources = inject(ResourcesService);
  private readonly flowTrace = inject(FlowTraceService);
  private readonly subscriptions = new Subscription();

  readonly menu$ = this.resources.menu$;
  readonly flowSteps$ = this.flowTrace.steps$;

  ngOnInit(): void {
    window.NEO_SHELL = true;
    window.addEventListener('proteoEventBusPublish', this.handleProteoEvent);
    window.addEventListener(NEO_FLOW_STEP_EVENT, this.handleFlowStepEvent);
  }

  ngOnDestroy(): void {
    window.removeEventListener('proteoEventBusPublish', this.handleProteoEvent);
    window.removeEventListener(NEO_FLOW_STEP_EVENT, this.handleFlowStepEvent);
    delete window.NEO_SHELL;
    this.subscriptions.unsubscribe();
  }

  clearFlowTrace(): void {
    this.flowTrace.clear();
  }

  nextFlowStep(step: FlowTraceStep): void {
    this.flowTrace.completeStep(step.id);
    window.dispatchEvent(new CustomEvent(NEO_FLOW_STEP_NEXT_EVENT, { detail: { id: step.id } }));
  }

  navigate(label: string): void {
    const routeByLabel: Record<string, string> = {
      workspace: '/workspace',
      aplicaciones: '/aplicaciones',
      escritorios: '/escritorios',
    };
    const route = routeByLabel[this.normalizeLabel(label)] ?? '/';
    void this.router.navigate([route]);
  }

  private readonly handleProteoEvent = (event: Event): void => {
    const detail = (event as CustomEvent<{ topic?: string; detail?: unknown }>).detail;
    const topic = detail?.topic ?? '';

    if (topic.includes('AUTHN_REQUEST')) {
      this.resources.clearMenu();
      void this.router.navigate(['/login']);
      return;
    }

    if (topic.includes('SAML_MANAGER:SUCCESS')) {
      this.resources.setMenuFromResponse(detail.detail);
      void this.router.navigate(['/']);
    }
  };

  private readonly handleFlowStepEvent = (event: Event): void => {
    const detail = (event as CustomEvent<{ id?: string; title?: string; description?: string }>).detail;
    if (!detail?.id || !detail.title || !detail.description) return;
    this.flowTrace.addStep({
      id: detail.id,
      title: detail.title,
      description: detail.description,
    });
  };

  private normalizeLabel(label: string): string {
    return label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
