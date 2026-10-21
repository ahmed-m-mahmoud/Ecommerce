import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-shared-header',
    standalone: true,
    imports: [],
    templateUrl: './shared-header.component.html',
    styleUrl: './shared-header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedHeaderComponent {}
