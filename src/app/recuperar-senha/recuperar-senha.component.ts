import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators,} from '@angular/forms';

@Component({
  selector: 'app-recuperar-senha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './recuperar-senha.component.html',
  styleUrl: './recuperar-senha.component.css'
})
export class RecuperarSenhaComponent {
  private formBuilder = inject(FormBuilder);
  private senhaForteRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  RecuperarSenhaForm = this.formBuilder.group({
    senha: ['',[Validators.required, Validators.pattern(this.senhaForteRegex)]],
    confirmarSenha: ['',[Validators.required,Validators.]],
  })
}
