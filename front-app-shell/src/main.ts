import { bootstrapApplication } from '@angular/platform-browser';

import { appConfig } from './app/app.config';
import { ShellLayoutComponent } from './app/components/shell-layout/shell-layout.component';

bootstrapApplication(ShellLayoutComponent, appConfig).catch((err) => console.error(err));
