import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators,} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-recuperar-senha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './recuperar-senha.component.html',
  styleUrl: './recuperar-senha.component.css'
})
export class RecuperarSenhaComponent {
  private formBuilder = inject(FormBuilder);
  private router = inject(ActivatedRoute);
  private senhaForteRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  RecuperarSenhaForm = this.formBuilder.group({
    senha: ['',[Validators.required, Validators.pattern(this.senhaForteRegex)]],
    confirmarSenha: ['',[Validators.required]],
  })
  recuperarSenha() {
    const token = this.router.snapshot.paramMap.get('token');
    alert(`Senha alterada com sucesso! token: ${token}`);
  }
}
