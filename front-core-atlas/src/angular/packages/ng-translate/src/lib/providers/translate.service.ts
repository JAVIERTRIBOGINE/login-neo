import { EventEmitter, Injectable, OnDestroy } from '@angular/core';
import { I18n } from '@proteo/i18n-utils';

/**
 * Proteo 4 translation service for Angular Apps based on Core i18n implementation
 */
@Injectable()
export class TranslateService extends I18n implements OnDestroy {
  readonly onLangChange: EventEmitter<string> = new EventEmitter<string>();

  constructor() {
    super();
    this.onChangeLang = this.onChangeLang.bind(this);
    document.addEventListener(I18n.CHANGE_LANGUAGE_EVENT, this.onChangeLang);
  }

  ngOnDestroy(): void {
    this.onLangChange.complete();
    document.removeEventListener(I18n.CHANGE_LANGUAGE_EVENT, this.onChangeLang);
  }

  override loadCommonMessages() {
    // Overwrite to avoid loadCommonMessages, already done by CORE.
    return Promise.resolve('');
  }

  get onLanguageChange(): EventEmitter<string> {
    return this.onLangChange;
  }

  private onChangeLang(ev: CustomEvent): void {
    this.use(ev.detail);
    this.onLangChange.emit(ev.detail);
  }
}
