import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
    NonNullableFormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { AuthService } from '../../../services/auth/auth.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
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
    selector: 'app-reset-password',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        ToastModule,
        TranslateModule,
    ],
    templateUrl: './reset-password.component.html',
    styleUrl: './reset-password.component.scss',
    providers: [MessageService],
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private fb = inject(NonNullableFormBuilder);
    private auth = inject(AuthService);
    private messageService = inject(MessageService);
    private translate = inject(TranslateService);

    token = '';
    email = '';
    submitted = false;
    isLoading = false;
    isSuccess = false;
    linkInvalid = false;
    serverError: string | null = null;
    showPassword = false;
    endSubs = new Subject<void>();

    form = this.fb.group({
        newPassword: [
            '',
            [
                Validators.required,
                Validators.minLength(PASSWORD_MIN_LENGTH),
                Validators.maxLength(PASSWORD_MAX_LENGTH),
            ],
        ],
        confirmPassword: ['', [Validators.required]],
    });

    ngOnInit(): void {
        const params = this.route.snapshot.queryParamMap;
        this.token = params.get('token') ?? '';
        this.email = params.get('email') ?? '';
        this.linkInvalid = !this.token || !this.email;
    }

    /* ---------- Validation (template helpers) ---------- */
    get strength(): PasswordStrength {
        return passwordStrength(this.form.controls.newPassword.value);
    }

    get newPasswordError(): string | null {
        return this.submitted
            ? firstErrorKey(this.form.controls.newPassword)
            : null;
    }

    get confirmError(): string | null {
        const confirm = this.form.controls.confirmPassword;
        if ((!this.submitted && !confirm.touched) || !confirm.value) {
            return null;
        }
        if (confirm.errors) return firstErrorKey(confirm);
        return confirm.value !== this.form.controls.newPassword.value
            ? 'AUTH.VALIDATION.PASSWORD_MISMATCH'
            : null;
    }

    get hasMismatch(): boolean {
        const confirm = this.form.controls.confirmPassword;
        return (
            !!confirm.value &&
            !confirm.errors &&
            confirm.value !== this.form.controls.newPassword.value
        );
    }

    /* ---------- Actions ---------- */
    submit(): void {
        this.submitted = true;
        this.serverError = null;

        if (this.linkInvalid) return;

        if (this.form.invalid || this.hasMismatch) {
            this.form.markAllAsTouched();
            this.toast('error', 'TOAST_MESSAGE.fillForm');
            return;
        }

        const { newPassword } = this.form.getRawValue();
        this.isLoading = true;

        this.auth
            .resetPassword({
                email: this.email,
                token: this.token,
                newPassword,
            })
            .pipe(takeUntil(this.endSubs), finalize(() => (this.isLoading = false)))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.isSuccess = true;
                        this.toast(
                            'success',
                            'AUTH.RESET.SUCCESS_TEXT',
                            'TOAST_MESSAGE.success'
                        );
                        setTimeout(
                            () => this.router.navigate(['/auth/login']),
                            3000
                        );
                    } else {
                        this.serverError =
                            response.message ||
                            this.translate.instant('ERROR_MESSAGES.UNKNOWN_ERROR');
                    }
                },
                error: (err) => {
                    this.serverError =
                        err?.message ||
                        this.translate.instant('AUTH.RESET.FAILURE');
                    this.toast('error', 'AUTH.RESET.FAILURE');
                },
            });
    }

    /* ---------- Helpers ---------- */
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
