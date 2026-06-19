/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, HostListener, Input, OnInit, ViewChild, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { LegacyLoaderModel } from './types/legacy-loader.model';
import { handlerEvent } from './utils/events-handler';
import { I18n } from '@proteo/i18n-utils';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'legacy-loader',
  template: `<iframe #iframeEl class="iframe-element" [src]="safeUrl"></iframe> `,
  styles: [
    `
      iframe {
        overflow: hidden;
        width: 100%;
        border: none;
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      iframe::-webkit-scrollbar {
        display: none;
      }
    `
  ],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule]
})
export class LegacyLoaderComponent implements OnInit, AfterViewInit {
  @Input({ required: true }) data!: LegacyLoaderModel;
  @ViewChild('iframeEl') iframeEl!: ElementRef;
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  safeUrl!: SafeResourceUrl;

  @HostListener('window:message', ['$event'])
  handleMessages(event) {
    const operation = event.data.operation;
    const data = event.data;

    if (operation) {
      (handlerEvent[operation] || handlerEvent['default'])(data, this.iframeEl);
    }
  }

  ngOnInit() {
    const url = this.route.snapshot.data?.['routeConfig']?.url ?? this.data.routePath;
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngAfterViewInit() {
    this.iframeEl.nativeElement.onload = () => {
      console.log('[Legacy loader] Iframe onload event');
      this.languageEventToIframe();
    };
    this.iframeEl.nativeElement.height = '336';
    document.addEventListener('bsLanguageSelectorChanged', () => {
      this.languageEventToIframe();
    });
  }

  languageEventToIframe() {
    const language = I18n.getInstance().language;
    const event = new CustomEvent('bsLanguageSelectorChanged', { detail: { language } });
    this.iframeEl.nativeElement.contentWindow.document.dispatchEvent(event);
  }
}
