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
import { GoogleAuthService } from '../../../services/auth/auth-google.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, finalize, takeUntil } from 'rxjs';
import {
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    PasswordStrength,
    firstErrorKey,
    passwordStrength,
} from '../auth.helpers';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        ToastModule,
        RouterModule,
        TranslateModule,
    ],
    templateUrl: './register.component.html',
    styleUrl: './register.component.scss',
    providers: [MessageService],
})
export class RegisterComponent implements OnDestroy {
    private messageService = inject(MessageService);
    private translate = inject(TranslateService);
    private fb = inject(NonNullableFormBuilder);
    private auth = inject(AuthService);
    private googleS = inject(GoogleAuthService);
    private router = inject(Router);

    form = this.fb.group({
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: [
            '',
            [
                Validators.required,
                Validators.minLength(PASSWORD_MIN_LENGTH),
                Validators.maxLength(PASSWORD_MAX_LENGTH),
            ],
        ],
        confirmPassword: ['', [Validators.required]],
    });

    submitted = false;
    isLoading = false;
    showPassword = false;
    error: string | null = null;
    endSubs = new Subject<void>();

    ngOnInit(): void {
        this.googleS.isLoggedInFromGoogle$
            .pipe(takeUntil(this.endSubs))
            .subscribe((isLoggedIn) => {
                if (isLoggedIn) this.router.navigate(['/home']);
            });
    }

    /* ---------- Validation (template helpers) ---------- */
    get strength(): PasswordStrength {
        return passwordStrength(this.form.controls.password.value);
    }

    get firstNameError(): string | null {
        return this.submitted
            ? firstErrorKey(this.form.controls.firstName)
            : null;
    }

    get lastNameError(): string | null {
        return this.submitted
            ? firstErrorKey(this.form.controls.lastName)
            : null;
    }

    get emailError(): string | null {
        return this.submitted ? firstErrorKey(this.form.controls.email) : null;
    }

    get passwordError(): string | null {
        return this.submitted
            ? firstErrorKey(this.form.controls.password)
            : null;
    }

    get confirmError(): string | null {
        const confirm = this.form.controls.confirmPassword;
        if ((!this.submitted && !confirm.touched) || !confirm.value) {
            return null;
        }
        if (confirm.errors) return firstErrorKey(confirm);
        return confirm.value !== this.form.controls.password.value
            ? 'AUTH.VALIDATION.PASSWORD_MISMATCH'
            : null;
    }

    get hasMismatch(): boolean {
        const confirm = this.form.controls.confirmPassword;
        return (
            !!confirm.value &&
            !confirm.errors &&
            confirm.value !== this.form.controls.password.value
        );
    }

    /* ---------- Actions ---------- */
    submit() {
        this.submitted = true;
        this.error = null;

        if (this.form.invalid || this.hasMismatch) {
            this.form.markAllAsTouched();
            this.toast('error', 'TOAST_MESSAGE.fillForm');
            return;
        }

        const { email, password, firstName, lastName } =
            this.form.getRawValue();
        this.isLoading = true;

        this.auth
            .signUp(email, password, firstName, lastName)
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
