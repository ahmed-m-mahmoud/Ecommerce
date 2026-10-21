import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export type CategoryIcon = 'phones' | 'computers' | 'headphones' | 'smartwatches';

@Component({
    selector: 'app-category-item',
    standalone: true,
    imports: [RouterModule],
    templateUrl: './category-item.component.html',
    styleUrl: './category-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryItemComponent {
    @Input() queryParams: any = {};
    @Input() icon: CategoryIcon = 'phones';

    get iconSvg(): CategoryIcon | null {
        return ['phones', 'computers', 'headphones', 'smartwatches'].includes(
            this.icon
        )
            ? this.icon
            : null;
    }
}
