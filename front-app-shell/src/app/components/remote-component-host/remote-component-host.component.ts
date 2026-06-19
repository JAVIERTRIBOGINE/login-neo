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
    const remote = await loadRemoteModule({
      type: 'module',
      remoteEntry: 'http://localhost:4500/remoteEntry.js',
      exposedModule: data.exposedModule,
    });

    const component = remote[data.exportName] as Type<unknown>;
    this.container.clear();
    this.container.createComponent(component, {
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

    const remote = await loadRemoteModule({
      type: 'module',
      remoteEntry: 'http://localhost:4500/remoteEntry.js',
      exposedModule: './loginApplication',
    });

    loginRemoteModuleRef = createNgModule(remote.Application, this.environmentInjector);
  }
}
