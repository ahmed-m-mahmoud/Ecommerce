import { Component, OnDestroy, inject } from '@angular/core';
import {
    NonNullableFormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { AuthService } from '../../../services/auth/auth.service';
import { Router, RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, finalize, takeUntil } from 'rxjs';
import { GoogleAuthService } from '../../../services/auth/auth-google.service';
import {
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    firstErrorKey,
} from '../auth.helpers';

@Component({
    selector: 'app-sigin',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        ToastModule,
        DialogModule,
        TranslateModule,
        RouterModule,
    ],
    templateUrl: './sigin.component.html',
    styleUrl: './sigin.component.scss',
    providers: [MessageService],
})
export class SigInComponent implements OnDestroy {
    private messageService = inject(MessageService);
    private translate = inject(TranslateService);
    private fb = inject(NonNullableFormBuilder);
    private auth = inject(AuthService);
    private googleS = inject(GoogleAuthService);
    private router = inject(Router);

    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: [
            '',
            [
                Validators.required,
                Validators.minLength(PASSWORD_MIN_LENGTH),
                Validators.maxLength(PASSWORD_MAX_LENGTH),
            ],
        ],
    });

    resetEmail = this.fb.control('', [Validators.required, Validators.email]);

    submitted = false;
    isLoading = false;
    isResetting = false;
    showPassword = false;
    error: string | null = null;
    visibleDialog = false;
    endSubs = new Subject<void>();

    ngOnInit(): void {
        this.googleS.isLoggedInFromGoogle$
            .pipe(takeUntil(this.endSubs))
            .subscribe((isLoggedIn) => {
                if (isLoggedIn) this.router.navigate(['/home']);
            });
    }

    /* ---------- Validation (template helpers) ---------- */
    get emailError(): string | null {
        return this.submitted ? firstErrorKey(this.form.controls.email) : null;
    }

    get passwordError(): string | null {
        return this.submitted
            ? firstErrorKey(this.form.controls.password)
            : null;
    }

    get resetEmailError(): string | null {
        return this.resetEmail.touched
            ? firstErrorKey(this.resetEmail)
            : null;
    }

    /* ---------- Actions ---------- */
    submit() {
        this.submitted = true;
        this.error = null;

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.toast('error', 'TOAST_MESSAGE.fillForm');
            return;
        }

        const { email, password } = this.form.getRawValue();
        this.isLoading = true;

        this.auth
            .login(email, password)
            .pipe(takeUntil(this.endSubs), finalize(() => (this.isLoading = false)))
            .subscribe({
                next: () => this.router.navigate(['/home']),
                error: (err) => this.showServerError(err?.message),
            });
    }

    signInWithGoogle() {
        this.googleS.signInWithGoogle().subscribe({
            error: () =>
                this.toast('error', 'TOAST_MESSAGE.googleSignInError'),
        });
    }

    /* ---------- Reset password dialog ---------- */
    openResetDialog() {
        this.resetEmail.markAsUntouched();
        this.visibleDialog = true;
    }

    resetPassword() {
        this.resetEmail.markAsTouched();
        if (this.resetEmail.invalid) return;

        const email = this.resetEmail.getRawValue();
        this.isResetting = true;

        this.auth
            .forgotPassword(email)
            .pipe(
                takeUntil(this.endSubs),
                finalize(() => (this.isResetting = false))
            )
            .subscribe({
                next: () => {
                    this.visibleDialog = false;
                    this.resetEmail.reset();
                    this.toast(
                        'success',
                        'TOAST_MESSAGE.emailSent',
                        'TOAST_MESSAGE.success'
                    );
                },
                error: (err) =>
                    this.showServerError(
                        err?.message ?? 'ERROR_MESSAGES.UNKNOWN_ERROR'
                    ),
            });
    }

    /* ---------- Helpers ---------- */
    private showServerError(message: string | undefined) {
        const key = message || 'ERROR_MESSAGES.UNKNOWN_ERROR';
        this.translate
            .get(['TOAST_MESSAGE.error', key])
            .pipe(takeUntil(this.endSubs))
            .subscribe((translations) => {
                this.error = translations[key];
                this.messageService.add({
                    severity: 'error',
                    summary: translations['TOAST_MESSAGE.error'],
                    detail: translations[key],
                });
            });
    }

    private toast(
        severity: 'error' | 'success',
        detailKey: string,
        summaryKey: string = 'TOAST_MESSAGE.error'
    ) {
        this.translate
            .get([summaryKey, detailKey])
            .pipe(takeUntil(this.endSubs))
            .subscribe((translations) => {
                this.messageService.add({
                    severity,
                    summary: translations[summaryKey],
                    detail: translations[detailKey],
                });
            });
    }

    ngOnDestroy(): void {
        this.endSubs.next();
        this.endSubs.complete();
    }
}
