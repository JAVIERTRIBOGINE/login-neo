import { CommonModule } from '@angular/common';
import {  AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginTranslationService } from '@app/login/application/services/login-translation.service';
import { TranslatePipe } from '@proteo/ng-translate';

@Component({
  selector: 'bs-loader',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, RouterOutlet, TranslatePipe],
  template: `<bs-loading></bs-loading>`,
})
export class LoaderComponent implements AfterViewInit{
  er = inject(ElementRef);
  loginTranslation = inject(LoginTranslationService)

  ngAfterViewInit(): void {
    const loading = this.er.nativeElement.querySelector('bs-loading');
    if( loading) {
      loading.loadingTitle =this.loginTranslation.translateFromKey('login:APP.STATIC_PAGE.LOADING.MAIN_TEXT');
      loading.loadingText = this.loginTranslation.translateFromKey('login:APP.STATIC_PAGE.LOADING.SECONDARY_TEXT')
    } 
    
  }
}
