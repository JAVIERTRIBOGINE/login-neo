import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';

@Component({
  selector: 'saml-form',
  standalone: true,
  imports: [CommonModule],
  template: `
    <form #form [attr.method]="method" [attr.action]="action">
      @for (field of fields; track field.name) {
        <input type="hidden" [attr.name]="field.name" [value]="field.value" />
      }
      <noscript><button type="submit">Continuar</button></noscript>
    </form>
  `,
})
export class SamlFormComponent implements AfterViewInit {
  @Input({ required: true }) action = '';
  @Input() method: 'GET' | 'POST' = 'POST';
  @Input() params: Record<string, string> = {};
  @Input() autoSubmit = true;

  @ViewChild('form', { static: true }) private form!: ElementRef<HTMLFormElement>;

  get fields(): { name: string; value: string }[] {
    return Object.entries(this.params).map(([name, value]) => ({ name, value }));
  }

  ngAfterViewInit(): void {
    if (this.autoSubmit) queueMicrotask(() => this.form.nativeElement.submit());
  }
}
