import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    Input,
    HostBinding,
    OnInit,
    OnDestroy } from '@angular/core';
import { NgxStarsModule } from 'ngx-stars';
import { Product } from '../../../models/product.model';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ConfirmPopupComponent } from './confirm-popup/confirm-popup.component';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ImagePreviewComponent } from './image-preview/image-preview.component';
import { AnimateFadeUpDirective } from '../../../shared/animations/scroll-animation/fade-up';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { WishlistService } from '../../../services/products/wishlist.service';
import { CartService } from '../../../services/orders/cart.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-product-item',
    standalone: true,
    imports: [
        NgxStarsModule,
        CommonModule,
        RouterModule,
        NgbModule,
        ToastModule,
        AnimateFadeUpDirective,
        TranslateModule
    ],
    templateUrl: './product-item.component.html',
    styleUrl: './product-item.component.scss',
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductItemComponent implements OnInit, OnDestroy {
    previewImage = false;
    isInWishlist = false;
    isOnWishlistPage = false;
    isToggling = false; // Prevent double-clicks
    isAddingToCart = false; // Prevent double-clicks

    private router = inject(Router);
    private modalService = inject(NgbModal);
    private cdr = inject(ChangeDetectorRef);
    private translate = inject(TranslateService);
    private messageService = inject(MessageService);
    private wishlistService = inject(WishlistService);
    private cartService = inject(CartService);
    private subscription?: Subscription;

    @Input()
    product: Product;

    @Input()
    flashSales: boolean;

    @Input()
    viewMode: 'grid' | 'list' = 'grid';

    @HostBinding('class.list-view')
    get isListView() {
        return this.viewMode === 'list';
    }

    ngOnInit(): void {
        // Check if we're on the wishlist page
        this.isOnWishlistPage = this.router.url.includes('wishlist');

        // Subscribe to wishlist changes to update heart state reactively
        this.subscription = this.wishlistService.wishlist$.subscribe(() => {
            this.updateWishlistState();
        });

        // Initial state check
        this.updateWishlistState();
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

    private updateWishlistState(): void {
        if (this.product) {
            this.isInWishlist = this.wishlistService.isProductInWishlist(this.product.id);
            this.cdr.markForCheck();
        }
    }

    toggleWishlist(event: Event): void {
        event.stopPropagation(); // Prevent navigating to details

        if (this.isToggling || !this.product) return;

        this.isToggling = true;

        if (this.isInWishlist) {
            this.wishlistService.removeFromWishlist(this.product.id).subscribe({
                next: () => {
                    this.isInWishlist = false;
                    this.isToggling = false;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.isToggling = false;
                    this.cdr.markForCheck();
                }
            });
        } else {
            this.wishlistService.addToWishlist(this.product.id).subscribe({
                next: () => {
                    this.isInWishlist = true;
                    this.isToggling = false;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.isToggling = false;
                    this.cdr.markForCheck();
                }
            });
        }
    }

    /** Quick add-to-cart straight from the card */
    addToCart(event: Event): void {
        event.stopPropagation();

        if (this.isAddingToCart || !this.product || !this.product.availableQuantity) return;

        this.isAddingToCart = true;

        this.cartService.addToCart(this.product.id, 1).subscribe({
            next: () => {
                this.isAddingToCart = false;
                this.toast('success', 'TOAST_MESSAGE.addedToCart', 'TOAST_MESSAGE.success');
            },
            error: () => {
                this.isAddingToCart = false;
                this.toast('error', 'ERROR_MESSAGES.UNKNOWN_ERROR', 'TOAST_MESSAGE.error');
            },
        });
    }

    showConfirmPopUp(event: Event) {
        event.stopPropagation(); // Prevent navigating to details
        const modalRef = this.modalService.open(ConfirmPopupComponent, {
            centered: true,
            backdropClass: 'glass-backdrop',
            windowClass: 'fade-scale'
        });
        modalRef.componentInstance.product = this.product;
    }

    openImagePreview() {
        const modalRef = this.modalService.open(ImagePreviewComponent, {
            size: 'xl',
            fullscreen: true,
            windowClass: 'image-preview-modal',
        });
        modalRef.componentInstance.imageUrl = this.product.imageUrl;
    }

    private toast(
        severity: 'error' | 'success',
        detailKey: string,
        summaryKey: string
    ) {
        this.translate
            .get([summaryKey, detailKey])
            .subscribe((translations) => {
                this.messageService.add({
                    severity,
                    summary: translations[summaryKey],
                    detail: translations[detailKey],
                });
            });
    }
}
