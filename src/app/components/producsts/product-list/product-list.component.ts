import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ProductItemComponent } from '../product-item/product-item.component';
import { CommonModule } from '@angular/common';
import { Product } from '../../../models/product.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-product-list',
    standalone: true,
    imports: [
        ProductItemComponent,
        CommonModule,
        TranslateModule,
    ],
    templateUrl: './product-list.component.html',
    styleUrl: './product-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent {
    @Input()
    products: Product[];
}
