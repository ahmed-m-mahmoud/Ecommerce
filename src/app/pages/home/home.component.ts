import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/product.model';
import {
    BehaviorSubject,
    Observable,
    finalize,
    Subject,
    take,
    takeUntil,
    tap,
} from 'rxjs';
import { PagedResult, ProductsService } from '../../services/products/products.service';
import { PromotionsService } from '../../services/promotions/promotions.service';
import { LoadingService } from '../../core/services/loading.service';
import { ProductListComponent } from '../../components/producsts/product-list/product-list.component';
import { CategoriesComponent } from '../../components/producsts/catepgries/categories.component';
import { SharedHeaderComponent } from '../../shared/components/shared-header/shared-header.component';
import { NewArrivalsComponent } from '../../components/producsts/new-arrivals/new-arrivals.component';
import { DetailsComponent } from '../../components/details/details.component';
import { SharedButton } from '../../shared/components/shared-button/shared-button.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TimerDigitComponent } from '../../components/producsts/catepgries/cat-banner/timer-digit/timer-digit.component';
import {
    NonNullableFormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

export type HomeSectionKey = 'products' | 'flashSales' | 'bestSelling';

/** Pagination state for one home product section */
interface HomePaginator {
    sub: BehaviorSubject<Product[]>;
    allLoaded: boolean;
    hasOnlyOnePage: boolean;
    nextPage: number;
    fetch: (page: number) => Observable<PagedResult<Product>>;
}

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [
        CommonModule,
        ProductListComponent,
        CategoriesComponent,
        SharedHeaderComponent,
        NewArrivalsComponent,
        DetailsComponent,
        SharedButton,
        LoadingComponent,
        ToastModule,
        ReactiveFormsModule,
        TranslateModule,
        TimerDigitComponent,
        RouterLink,
    ],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
    providers: [MessageService],
})
export class HomeComponent implements OnInit, OnDestroy {
    products$ = new BehaviorSubject<Product[]>([]);
    flashSales$ = new BehaviorSubject<Product[]>([]);
    bestSelling$ = new BehaviorSubject<Product[]>([]);

    private productsS = inject(ProductsService);
    private promotionsS = inject(PromotionsService);
    private fb = inject(NonNullableFormBuilder);
    private translate = inject(TranslateService);
    private messageService = inject(MessageService);
    loadingS = inject(LoadingService);

    /* ---------- Newsletter ---------- */
    newsletterForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
    });
    isSubscribing = false;
    isSubscribed = false;
    endSubs = new Subject<void>();

    /* ---------- Timer ---------- */
    targetDate = signal(new Date(new Date().getTime() + 24 * 60 * 60 * 1000));
    currentTime = signal(new Date());
    private animationFrameId: number | undefined;

    countdown = computed(() => {
        const timeDifference =
            this.targetDate().getTime() - this.currentTime().getTime();

        if (timeDifference > 0) {
            return {
                days: Math.floor(timeDifference / (1000 * 60 * 60 * 24)),
                hours: Math.floor(
                    (timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
                ),
                minutes: Math.floor(
                    (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
                ),
                seconds: Math.floor((timeDifference % (1000 * 60)) / 1000),
            };
        } else {
            return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }
    });

    ngOnInit(): void {
        this.loadInitialData();
        this.fetchFlashSaleDate();
        this.updateTime();
    }

    ngOnDestroy(): void {
        if (this.animationFrameId !== undefined) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.endSubs.next();
        this.endSubs.complete();
    }

    /* ---------- Data loading ---------- */
    private readonly paginators: Record<HomeSectionKey, HomePaginator> = {
        products: {
            sub: this.products$,
            allLoaded: false,
            hasOnlyOnePage: false,
            nextPage: 2,
            fetch: (page) => this.productsS.getProducts({ pageNumber: page }),
        },
        flashSales: {
            sub: this.flashSales$,
            allLoaded: false,
            hasOnlyOnePage: false,
            nextPage: 2,
            fetch: (page) => this.productsS.getFlashSales(page),
        },
        bestSelling: {
            sub: this.bestSelling$,
            allLoaded: false,
            hasOnlyOnePage: false,
            nextPage: 2,
            fetch: (page) => this.productsS.getBestSelling(page),
        },
    };

    get allProductsLoaded(): boolean {
        return this.paginators.products.allLoaded;
    }

    get allFlashSalesLoaded(): boolean {
        return this.paginators.flashSales.allLoaded;
    }

    get allBestSellingLoaded(): boolean {
        return this.paginators.bestSelling.allLoaded;
    }

    get allFlashSalesInOnePage(): boolean {
        return this.paginators.flashSales.hasOnlyOnePage;
    }

    loadInitialData() {
        this.applyFirstPage(this.paginators.products);
        this.applyFirstPage(this.paginators.flashSales);
        this.applyFirstPage(this.paginators.bestSelling);
    }

    private applyFirstPage(state: HomePaginator) {
        state
            .fetch(1)
            .pipe(take(1), takeUntil(this.endSubs))
            .subscribe({
                next: (res) => {
                    state.sub.next(res.items);
                    state.nextPage = 2;
                    state.allLoaded = !res.hasNextPage;
                    state.hasOnlyOnePage = !res.hasNextPage && !res.hasPreviousPage;
                },
            });
    }

    /** Load more products, or collapse back to page 1 once everything is shown */
    loadMore(category: HomeSectionKey) {
        const state = this.paginators[category];

        if (state.hasOnlyOnePage) return;

        if (state.allLoaded) {
            // Show Less: reset to page 1
            state
                .fetch(1)
                .pipe(take(1), takeUntil(this.endSubs))
                .subscribe((res) => {
                    state.sub.next(res.items);
                    state.nextPage = 2;
                    state.allLoaded = !res.hasNextPage;
                });
            return;
        }

        state
            .fetch(state.nextPage)
            .pipe(take(1), takeUntil(this.endSubs))
            .subscribe({
                next: (res) => {
                    state.sub.next([...state.sub.value, ...res.items]);
                    state.nextPage++;
                    state.allLoaded = !res.hasNextPage;
                },
            });
    }

    /* ---------- Flash sale countdown date ---------- */
    private fetchFlashSaleDate() {
        this.promotionsS.getFlashSaleEndDate().subscribe({
            next: (date) => this.targetDate.set(date),
            error: (err) => {
                console.error('Failed to fetch flash sale date', err);
                this.targetDate.set(this.calculateFallbackDate(1, 5, 9));
            },
        });
    }

    private calculateFallbackDate(days: number, hours = 0, minutes = 0): Date {
        const now = new Date();
        return new Date(
            now.getTime() +
            days * 24 * 60 * 60 * 1000 +
            hours * 60 * 60 * 1000 +
            minutes * 60 * 1000
        );
    }

    private updateTime() {
        this.currentTime.set(new Date());
        this.animationFrameId = requestAnimationFrame(() => this.updateTime());
    }

    /* ---------- Newsletter ---------- */
    subscribe() {
        if (this.isSubscribing) return;

        const email = this.newsletterForm.controls.email;

        if (email.invalid) {
            email.markAsTouched();
            return;
        }

        this.isSubscribing = true;
        this.translate
            .get(['TOAST_MESSAGE.success', 'HOME.NEWSLETTER_SUCCESS'])
            .pipe(
                take(1),
                takeUntil(this.endSubs),
                tap((t) => this.messageService.add({
                    severity: 'success',
                    summary: t['TOAST_MESSAGE.success'],
                    detail: t['HOME.NEWSLETTER_SUCCESS'],
                })),
                finalize(() => (this.isSubscribing = false))
            )
            .subscribe(() => {
                this.newsletterForm.reset();
                this.isSubscribed = true;
            });
    }
}
