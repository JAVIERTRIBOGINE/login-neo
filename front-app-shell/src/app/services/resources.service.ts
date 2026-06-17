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
    return this.http.get<ResourcesResponse>('http://localhost:8082/resources', { withCredentials: true }).pipe(
      map((response) => response.resources ?? []),
      tap((items) => this.menuSubject.next(items))
    );
  }

  clearMenu(): void {
    this.menuSubject.next([]);
  }
}
