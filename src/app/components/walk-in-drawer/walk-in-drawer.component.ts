import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { WalkInRegistration } from '../../models/attendance';

@Component({
  selector: 'app-walk-in-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './walk-in-drawer.component.html',
  styleUrl: './walk-in-drawer.component.scss',
})
export class WalkInDrawerComponent {
  @Input() open = false;
  @Input() submitting = false;
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<WalkInRegistration>();

  readonly form: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      name: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.minLength(7)]],
      location: ['', Validators.required],
    });
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    const controls = this.form.getRawValue() as {
      name: string;
      phoneNumber: string;
      location: string;
    };

    const payload: WalkInRegistration = {
      name: controls.name.trim(),
      phoneNumber: controls.phoneNumber.trim(),
      location: controls.location.trim(),
    };

    this.submitted.emit(payload);
  }

  clearForm(): void {
    this.form.reset();
  }
}
