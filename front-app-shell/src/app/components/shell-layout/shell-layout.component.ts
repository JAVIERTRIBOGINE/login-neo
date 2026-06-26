import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
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
  flowPanelWidth = 520;

  private readonly minFlowPanelWidth = 420;
  private readonly minMainContentWidth = 180;
  private readonly fixedShellColumnsWidth = 210;
  private isResizingFlowPanel = false;

  ngOnInit(): void {
    /*
     * Marcador global de POC: el MFE login lo usa para saber que esta embebido
     * en la shell NEO. En ese modo no abre modales bloqueantes; publica steps al
     * panel lateral y espera al boton "Siguiente".
     */
    window.NEO_SHELL = true;
    window.addEventListener('proteoEventBusPublish', this.handleProteoEvent);
    window.addEventListener(NEO_FLOW_STEP_EVENT, this.handleFlowStepEvent);
  }

  ngOnDestroy(): void {
    window.removeEventListener('proteoEventBusPublish', this.handleProteoEvent);
    window.removeEventListener(NEO_FLOW_STEP_EVENT, this.handleFlowStepEvent);
    delete window.NEO_SHELL;
    document.body.classList.remove('shell-flow-resizing');
    this.subscriptions.unsubscribe();
  }

  clearFlowTrace(): void {
    this.flowTrace.clear();
  }

  nextFlowStep(step: FlowTraceStep): void {
    this.flowTrace.completeStep(step.id);
    /*
     * El click en "Siguiente" desbloquea la Promise que el MFE login dejo
     * pendiente. Asi la demo enseña cada salto backend sin tapar la UI central.
     */
    window.dispatchEvent(new CustomEvent(NEO_FLOW_STEP_NEXT_EVENT, { detail: { id: step.id } }));
  }

  toggleFlowStep(step: FlowTraceStep): void {
    this.flowTrace.toggleStep(step.id);
  }

  hasActiveFlowStep(steps: FlowTraceStep[]): boolean {
    return steps.some((step) => !step.completed);
  }

  startFlowPanelResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizingFlowPanel = true;
    document.body.classList.add('shell-flow-resizing');
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.isResizingFlowPanel) return;
    const width = window.innerWidth - event.clientX;
    const maxFlowPanelWidth = Math.max(
      this.minFlowPanelWidth,
      window.innerWidth - this.fixedShellColumnsWidth - this.minMainContentWidth
    );
    this.flowPanelWidth = Math.min(maxFlowPanelWidth, Math.max(this.minFlowPanelWidth, width));
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    if (!this.isResizingFlowPanel) return;
    this.isResizingFlowPanel = false;
    document.body.classList.remove('shell-flow-resizing');
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
      /*
       * NetScaler/resources devuelve 401: se limpia el menú, pero la navegación
       * continúa en el MFE SAML hacia /authnRequest. Solo PingAM puede decidir,
       * al comprobar su cookie SSO, si es necesario derivar al flujo OAuth.
       */
      this.resources.clearMenu();
      return;
    }

    if (topic.includes('SAML_MANAGER:SUCCESS')) {
      /*
       * Cuando el MFE SAML publica exito, la shell toma el payload resources,
       * construye el menu izquierdo y aterriza directamente en Workspace.
       */
      this.resources.setMenuFromResponse(detail.detail);
      void this.router.navigate(['/workspace']);
    }
  };

  private readonly handleFlowStepEvent = (event: Event): void => {
    const detail = (event as CustomEvent<{ id?: string; title?: string; description?: string }>).detail;
    if (!detail?.id || !detail.title || !detail.description) return;
    if (this.shouldAutoResolveRepeatedSamlStep(detail.title)) {
      window.dispatchEvent(new CustomEvent(NEO_FLOW_STEP_NEXT_EVENT, { detail: { id: detail.id } }));
      return;
    }
    /*
     * Canal visual de POC: cualquier proyecto puede emitir neoFlowStep y la shell
     * lo transforma en tarjeta acumulada con descripcion y diagrama secuencial.
     */
    this.flowTrace.addStep({
      id: detail.id,
      title: detail.title,
      description: detail.description,
    });
  };

  private shouldAutoResolveRepeatedSamlStep(title: string): boolean {
    const normalizedTitle = title.toLowerCase();
    const isRepeatedSamlEntryStep = normalizedTitle.includes('401 resources')
      || normalizedTitle.includes('authnrequest y redirección pingam');

    if (!isRepeatedSamlEntryStep) return false;

    const previousSteps = this.flowTrace.currentSteps;
    const oauthAlreadyCompleted = previousSteps.some((step) => {
      const text = `${step.title} ${step.description}`.toLowerCase();
      return text.includes('autenticación ok')
        || text.includes('autenticacion ok')
        || text.includes('tokens')
        || text.includes('auth_success');
    });
    const sameStepAlreadyShown = previousSteps.some((step) => step.title.toLowerCase() === normalizedTitle);

    return oauthAlreadyCompleted && sameStepAlreadyShown;
  }

  private normalizeLabel(label: string): string {
    return label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
