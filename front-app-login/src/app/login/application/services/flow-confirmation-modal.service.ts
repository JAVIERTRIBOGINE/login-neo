import { Injectable } from '@angular/core';

export interface FlowConfirmationStep {
  title: string;
  description: string;
}

const NEO_FLOW_STEP_EVENT = 'neoFlowStep';
const NEO_FLOW_STEP_NEXT_EVENT = 'neoFlowStepNext';

@Injectable({ providedIn: 'root' })
export class FlowConfirmationModalService {
  private queue = Promise.resolve();

  confirm(step: FlowConfirmationStep): Promise<void> {
    const next = this.queue.then(() => this.openModal(step));
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async openModal(step: FlowConfirmationStep): Promise<void> {
    if (!document?.body) return Promise.resolve();

    return this.openTraceStep(step);
  }

  private openTraceStep(step: FlowConfirmationStep): Promise<void> {
    return new Promise((resolve) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      /*
       * En la POC cada hito backend se publica como evento de navegador. La shell
       * lo escucha y lo pinta en el panel "Back flow" como tarjeta acumulada.
       */
      window.dispatchEvent(new CustomEvent(NEO_FLOW_STEP_EVENT, {
        detail: {
          id,
          ...step,
        },
      }));

      if (!(window as Window & { NEO_SHELL?: boolean }).NEO_SHELL) {
        /*
         * Si el login corre standalone en :4500 no hay shell que conteste al step;
         * resolvemos inmediatamente para mantener el comportamiento autonomo.
         */
        resolve();
        return;
      }

      const handleNext = (event: Event): void => {
        const detail = (event as CustomEvent<{ id?: string }>).detail;
        if (detail?.id !== id) return;
        window.removeEventListener(NEO_FLOW_STEP_NEXT_EVENT, handleNext);
        resolve();
      };

      /*
       * Dentro de la shell el flujo queda pausado hasta que el usuario pulse
       * "Siguiente" en la tarjeta correspondiente. Asi la presentacion puede
       * explicar cada salto sin bloquear la pantalla central con overlays.
       */
      window.addEventListener(NEO_FLOW_STEP_NEXT_EVENT, handleNext);

      /*
       * Modal bloqueante desactivado para la POC:
       * antes se creaba un overlay y un boton Confirmar aqui.
       * Ahora el flujo avanza desde la tarjeta lateral con "Siguiente".
       */
    });
  }
}
