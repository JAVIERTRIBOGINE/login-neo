import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  EnvironmentInjector,
  OnDestroy,
  OnInit,
  Type,
  ViewChild,
  ViewContainerRef,
  createNgModule,
  inject,
} from '@angular/core';
import { NgIf } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/module-federation';

interface RemoteRouteData {
  exposedModule: string;
  exportName: string;
}

let loginRemoteModuleRef: ReturnType<typeof createNgModule> | undefined;

@Component({
  selector: 'neo-remote-component-host',
  standalone: true,
  imports: [NgIf],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="remote-host" aria-live="polite">
      <ng-container #container></ng-container>
      <saml-loader *ngIf="loading"></saml-loader>
    </section>
  `,
  styles: [`
    .remote-host {
      display: block;
      min-height: 480px;
    }
  `],
})
export class RemoteComponentHostComponent implements OnInit, OnDestroy {
  @ViewChild('container', { read: ViewContainerRef, static: true })
  private readonly container!: ViewContainerRef;

  private readonly route = inject(ActivatedRoute);
  private readonly environmentInjector = inject(EnvironmentInjector);

  loading = true;

  async ngOnInit(): Promise<void> {
    await this.bootstrapLoginChild();

    const data = this.route.snapshot.data as RemoteRouteData;
    /*
     * La shell no importa el login en build-time: lo carga en runtime desde el
     * remoteEntry del MFE. La ruta de la shell decide que exposedModule/exportName
     * se debe pintar en esta pantalla.
     */
    const remote = await loadRemoteModule({
      type: 'module',
      remoteEntry: 'http://localhost:4500/remoteEntry.js',
      exposedModule: data.exposedModule,
    });

    const component = remote[data.exportName] as Type<unknown>;
    this.container.clear();
    this.container.createComponent(component, {
      /*
       * Los componentes standalone del MFE necesitan el EnvironmentInjector del
       * modulo remoto Application. Si se crean con el injector de la shell, los
       * providers propios del login (router, tokens OAuth, traducciones, config)
       * pueden no existir en la primera carga.
       */
      environmentInjector: loginRemoteModuleRef ?? this.environmentInjector,
    });
    this.loading = false;
  }

  ngOnDestroy(): void {
    this.container.clear();
  }

  private async bootstrapLoginChild(): Promise<void> {
    if (loginRemoteModuleRef) {
      return;
    }

    /*
     * Primero se instancia el modulo Application expuesto por el login. Ese modulo
     * inicializa la configuracion Proteo y registra providers que luego consumen
     * AuthorizeComponent/GetTokensComponent aunque entren por lazy routing.
     */
    const remote = await loadRemoteModule({
      type: 'module',
      remoteEntry: 'http://localhost:4500/remoteEntry.js',
      exposedModule: './loginApplication',
    });

    loginRemoteModuleRef = createNgModule(remote.Application, this.environmentInjector);
  }
}
