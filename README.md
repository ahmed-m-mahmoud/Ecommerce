# Exclusive E-Store — Angular Client

> The storefront and customer-facing frontend for the Exclusive E-Commerce platform.  
> Built with Angular 17, Standalone Components, and a production-oriented interceptor pipeline.

![Angular](https://img.shields.io/badge/Angular-17-DD0031?style=flat-square&logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript)
![RxJS](https://img.shields.io/badge/RxJS-7.8-B7178C?style=flat-square&logo=reactivex)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=flat-square&logo=bootstrap)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe)
![PrimeNG](https://img.shields.io/badge/PrimeNG-17-3B82F6?style=flat-square)
![i18n](https://img.shields.io/badge/i18n-AR%20%7C%20EN-F59E0B?style=flat-square)

---

## Demo

**Live:** [https://premium-commerce.runasp.net](https://premium-commerce.runasp.net)

---

## Features

| Area | Details |
|------|---------|
| **Product Catalog** | Paginated product listing with filtering (category, price range, stock), sorting, and search |
| **Product Detail** | Full product view with image gallery, star ratings, reviews, and related products |
| **Categories** | Category browsing with dynamic routing |
| **Flash Sales & Promotions** | Dedicated flash sales, best-selling, and new arrivals sections |
| **Shopping Cart** | Add, remove, update quantity — persisted and synced with backend |
| **Wishlist** | Save favorites, move to cart, manage from profile |
| **Checkout Wizard** | Multi-step form (shipping → payment) with form validation and unsaved-changes guard |
| **Stripe Payments** | Integrated Stripe Elements for secure card payment with PaymentIntent flow |
| **Order Management** | Order history, order detail view with status tracking (Pending → Shipped → Delivered) |
| **Order Confirmation** | Post-payment confirmation page with order summary |
| **Authentication** | JWT login/register with auto-login, silent token refresh, and Google OAuth |
| **Password Recovery** | Forgot password + reset password flow |
| **User Profile** | Profile editing, order history, and wishlist — tabbed layout with child routes |
| **Reviews & Ratings** | Star-based product reviews with ngx-stars |
| **Internationalization** | Full Arabic (RTL) and English (LTR) support with runtime switching |
| **Scroll Animations** | Intersection Observer–driven fade-up animations on product cards |
| **Back to Top** | Custom directive for smooth scroll-to-top |
| **Loading States** | Global loading indicator via interceptor |
| **Error Handling** | Centralized error interceptor with user-friendly alerts (SweetAlert2) |
| **Caching** | Client-side LRU cache with TTL + mutation-driven invalidation |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 17 (Standalone Components) |
| Language | TypeScript 5.4 |
| Styling | SCSS + Bootstrap 5.3 + CSS Logical Properties (RTL) |
| UI Library | PrimeNG 17 + ng-bootstrap |
| State | BehaviorSubjects (shared) + Signals (local) |
| HTTP | Functional interceptor chain (cache → loading → auth → error) |
| Payments | Stripe Elements via ngx-stripe |
| i18n | @ngx-translate/core with runtime JSON loading |
| Ratings | ngx-stars |
| Alerts | SweetAlert2 |
| Animations | Angular Animations + custom Intersection Observer directives |
| Deployment | Netlify (static SPA with client-side routing) |

---

## Project Structure

```
src/app/
├── components/              # Reusable feature components
│   ├── producsts/           # Product cards, categories, new arrivals, product list
│   ├── cart/                # Cart icon with badge
│   ├── details/             # Product detail sub-components
│   └── orders/              # Order-related components
│
├── pages/                   # Route-level page components
│   ├── home/                # Landing page (flash sales, best sellers, categories)
│   ├── products/            # Full product catalog with filters
│   ├── product-details/     # Single product view + reviews
│   ├── cart/                # Shopping cart page
│   ├── checkout-wizard/     # Multi-step checkout (shipping + Stripe payment)
│   ├── payment/             # Payment redirect
│   ├── order-confirmation/  # Post-payment confirmation
│   ├── profile/             # User profile with nested routes
│   │   ├── edit/            # Edit profile info
│   │   ├── orders/          # Order history
│   │   └── wishlist/        # Saved items
│   ├── Auth/                # Login, register, reset password
│   ├── about/               # About page
│   └── contact/             # Contact page
│
├── services/                # Domain services (HTTP + state)
│   ├── auth/                # AuthService, GoogleAuthService, guards, interceptor
│   ├── products/            # ProductsService, WishlistService
│   ├── orders/              # OrdersService, CartService
│   ├── payments/            # PaymentsService (Stripe integration)
│   ├── reviews/             # ReviewService + ReviewModel
│   ├── promotions/          # PromotionsService
│   ├── profile/             # ProfileService
│   ├── category.service.ts  # Category fetching
│   └── alert.service.ts     # SweetAlert2 wrapper
│
├── core/                    # Cross-cutting infrastructure
│   ├── services/            # LoadingService, CacheService
│   └── interceptors/        # Loading interceptor, Cache interceptor
│
├── shared/                  # Reusable building blocks
│   ├── components/          # Header, Footer, Loading, Not Found, Sidebar,
│   │                        # SharedButton, SharedInput, SharedHeader
│   ├── directives/          # BackToTopDirective
│   ├── pipes/               # TruncatePipe, TwoDigitsPipe
│   ├── animations/          # Popup animation, scroll-triggered fade-up
│   └── services/            # Shared utility services
│
├── models/                  # TypeScript interfaces
│   ├── auth.model.ts        # AuthResponse, LoginRequest, RegisterRequest
│   ├── user.model.ts        # User class with token management
│   ├── product.model.ts     # Product interface
│   ├── cart.model.ts        # Cart item interface
│   ├── order.model.ts       # Order + OrderItem interfaces
│   └── profile.model.ts     # Profile interface
│
├── guards/                  # Route guards
│   └── unsaved-changes.guard.ts
│
├── interceptors/            # Global interceptors
│   └── global-error.interceptor.ts
│
├── app.routes.ts            # Route definitions with lazy loading
├── app.config.ts            # App providers, interceptor chain, Stripe, i18n
└── translation.config.ts    # ngx-translate loader configuration
```

---

## HTTP Interceptor Pipeline

Interceptors are registered in a specific order for correct behavior:

```
Outgoing Request
       │
       ▼
┌─────────────────────┐
│  1. Cache            │  Return cached response if available (skip network)
├─────────────────────┤
│  2. Loading          │  Show/hide global loading indicator
├─────────────────────┤
│  3. Auth             │  Attach JWT Bearer token, handle 401 → silent refresh
├─────────────────────┤
│  4. Global Error     │  Map HTTP errors → user-friendly SweetAlert messages
└─────────────────────┘
       │
       ▼
   .NET API
```

---

## Authentication Flow

```
App Init (AppComponent.ngOnInit)
       │
       ▼
   autoLogin()
       │
       ├── localStorage has userData?
       │   ├── Access token valid? → Emit user, setup refresh timer
       │   └── Expired but has refresh token? → Silent refresh → Emit user
       │
       └── No data → authReady$.next(true) → Guards unblock
```

- **Access token** — attached to every API request via `UserInterceptor`
- **Refresh token** — proactively refreshed 5 minutes before expiry
- **Auto-logout** — on token expiry with silent refresh attempt first
- **Google OAuth** — integrated via `GoogleAuthService`

---

## Checkout & Payment Flow

```
Cart → Checkout Wizard
         │
         ├── Step 1: Shipping Details (Reactive Form + country selector)
         │
         ├── Step 2: Stripe Payment (Stripe Elements card input)
         │              │
         │              └── createCheckoutSession() → PaymentIntent created
         │                  (order NOT created yet)
         │
         └── Payment succeeds → Stripe webhook → Order materialized server-side
                                                → Redirect to /order-confirmation/:id
```

The **payment-first** model ensures no orphaned orders are created for failed payments.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Angular CLI** ≥ 17
- Backend API running (see `../api/` directory)

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

The app runs at `http://localhost:4200` by default.

### Environment Configuration

Create `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://your-api-url/api',
  stripePublishableKey: 'pk_test_...'
};
```

---

## Key Engineering Patterns

### Client-Side Caching
- **LRU cache** with per-route TTL rules and hit/miss instrumentation
- **Mutation-driven invalidation** — writing to a resource invalidates related cache entries
- Cache interceptor runs **first** in the pipeline to short-circuit unnecessary network calls

### State Architecture
- **BehaviorSubjects** for cross-feature domain state (auth, cart, wishlist, profile)
- **Signals** for view-local state (checkout steps, loading flags, UI toggles)
- No heavyweight global store — each concern lives at its lowest useful abstraction level

### Internationalization (i18n)
- Runtime language switching via `@ngx-translate`
- `document.documentElement.dir` updated dynamically (LTR ↔ RTL)
- CSS logical properties (`margin-inline-start`, `padding-inline-end`) for direction-agnostic layouts
- Language preference persisted in `localStorage`

### Scroll Animations
- Custom `AnimateFadeUpDirective` using Intersection Observer
- Elements animate in on first viewport entry — no library overhead

---

## Deployment

Deployed to **Netlify** with:
- SPA routing: all paths redirect to `index.html` (configured in `netlify.toml`)
- Node.js 22 build environment
- Production build: `npm run build` → output to `dist/e-commerce/browser`

---

