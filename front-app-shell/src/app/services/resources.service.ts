import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, map, tap } from 'rxjs';

import { ResourcesResponse, ShellMenuItem } from '../models';

@Injectable({ providedIn: 'root' })
export class ResourcesService {
  private readonly http = inject(HttpClient);
  private readonly menuSubject = new BehaviorSubject<ShellMenuItem[]>([]);

  readonly menu$ = this.menuSubject.asObservable();

  loadMenu() {
    /*
     * Entrada SAML clasica: la shell intenta leer /resources. Si el mock devuelve
     * 401, otro servicio publica AUTHN_REQUEST y se inicia OAuth/PingAM.
     */
    return this.http.get<ResourcesResponse>('http://localhost:8082/resources', { withCredentials: true }).pipe(
      map((response) => response.resources ?? []),
      tap((items) => this.menuSubject.next(items))
    );
  }

  setMenuFromResponse(response: unknown): void {
    /*
     * Tras SAML_SUCCESS no volvemos a pedir /resources: usamos el payload ya
     * publicado por el MFE para construir el menu izquierdo de NEO.
     */
    const resources = (response as Partial<ResourcesResponse> | undefined)?.resources;
    this.menuSubject.next(Array.isArray(resources) ? resources : []);
  }

  clearMenu(): void {
    this.menuSubject.next([]);
  }
}
