import { ChangeDetectorRef, Injectable, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { LoggerUtils } from '@proteo/logger-utils';
import { deepEquals } from '@proteo/object-utils';
import { Subscription } from 'rxjs';
import { TranslateService } from '../providers/translate.service';

/**
 * Angular pipe for proteo4 translations. It updates the components also the language has changed
 */
@Injectable()
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // required to update the value when the promise is resolved
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  /**
   * Cached translated value
   */
  private value = '';
  /**
   * Last key translated for caching purposes
   */
  private lastKey: string;
  /**
   * Las interpolation params for caching purposes
   */
  private lastParams: any[];
  /**
   * Observable to update the DOM element reference if the language is updated globally
   */
  private onLangChange: Subscription;

  constructor(private translate: TranslateService, private ref: ChangeDetectorRef) {}

  /**
   * process the key and generates its translated value. It also refresh the value on language change
   * @param key The key to be translated
   * @param args the interpolation parameters
   */
  transform(key: string, ...args: any[]): string {
    if (!key) {
      LoggerUtils.getInstance().warn(`No key specified for translation`);
      return key;
    }

    // if we ask another time for the same key, return the last value
    if (key === this.lastKey && deepEquals(args, this.lastParams)) {
      return this.value;
    }

    let interpolation = {};
    if (args[0] && args.length) {
      if (typeof args[0] === 'string' && args[0].length) {
        try {
          interpolation = JSON.parse(args[0]);
        } catch (e) {
          const msg = `Wrong parameter in TranslatePipe. Expected a valid Object, received: ${args[0]}`;
          LoggerUtils.getInstance().error(msg);
          throw new Error(msg);
        }
      } else if (typeof args[0] === 'object' && !Array.isArray(args[0])) {
        interpolation = args[0];
      }
    }

    this.storeValues(key, args, interpolation);
    // subscribe to onLanguageChange
    if (!this.onLangChange) {
      this.onLangChange = this.translate.onLanguageChange.subscribe(() => {
        LoggerUtils.getInstance().debug(`On change Event for key ${key}`);
        this.storeValues(key, args, interpolation);
      });
    }
    return this.value;
  }

  /**
   * Remove the subscriptions if exist
   */
  ngOnDestroy(): void {
    if (this.onLangChange) {
      this.onLangChange.unsubscribe();
      this.onLangChange = null;
    }
  }

  private storeValues(key: string, params: any[], interpolation: object): void {
    this.lastKey = key;
    this.lastParams = params;
    this.value = this.translate.t(key, interpolation);
    this.ref.markForCheck();
  }
}
