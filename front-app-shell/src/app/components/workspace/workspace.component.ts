import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';

@Component({
  selector: 'neo-workspace',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="app-page">
      <img
        src="https://apps.cdn.int.aws.bancsabadell.com/favicon.ico"
        alt=""
        class="app-page__image"
      />
      <h1>Workspace</h1>
    </section>
  `,
  styles: [`
    .app-page {
      display: grid;
      place-items: center;
      align-content: center;
      min-height: calc(100vh - 64px - 48px - 64px);
      gap: 24px;
      color: #111827;
      background: #f7f9fb;
    }

    .app-page__image {
      width: 96px;
      height: 96px;
      object-fit: contain;
    }

    h1 {
      margin: 0;
      font-size: 40px;
      font-weight: 700;
    }
  `],
})
export class WorkspaceComponent {}
