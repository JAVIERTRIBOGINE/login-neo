import { Injectable } from '@angular/core';

export interface FlowConfirmationStep {
  title: string;
  description: string;
}

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

    return this.openFallbackModal(step);
  }

  private openFallbackModal(step: FlowConfirmationStep): Promise<void> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', step.title);
      overlay.style.cssText = [
        'position: fixed',
        'inset: 0',
        'z-index: 2147483647',
        'display: grid',
        'place-items: center',
        'background: rgba(0, 0, 0, 0.35)',
      ].join(';');

      const dialog = document.createElement('div');
      dialog.style.cssText = [
        'width: min(560px, calc(100vw - 32px))',
        'box-sizing: border-box',
        'padding: 32px',
        'border-radius: 8px',
        'background: #ffffff',
        'box-shadow: 0 16px 40px rgba(31, 41, 55, 0.24)',
        'font-family: Arial, Helvetica, sans-serif',
        'color: #111827',
      ].join(';');

      const title = document.createElement('h2');
      title.textContent = step.title;
      title.style.cssText = 'margin: 0 0 16px; font-size: 22px; line-height: 1.3; font-weight: 600;';

      const description = document.createElement('p');
      description.textContent = step.description;
      description.style.cssText = 'margin: 0 0 28px; font-size: 16px; line-height: 1.5;';

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Confirmar';
      button.style.cssText = [
        'min-height: 44px',
        'padding: 0 24px',
        'border: 0',
        'border-radius: 999px',
        'background: #006dff',
        'color: #ffffff',
        'font: inherit',
        'font-weight: 600',
        'cursor: pointer',
      ].join(';');

      button.addEventListener('click', () => {
        overlay.remove();
        resolve();
      });

      dialog.append(title, description, button);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      button.focus();
    });
  }
}
