import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email: string = '';
  password: string = '';

  errorMsg: string = '';
  recoverMsg: string = '';
  loginAttempts: number = 0;

  showRecoverPasswordSection: boolean = false;

  emailRecuperacaoSenha: string = '';

  carregando: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login() {
    if (!this.email || !this.password) {
      this.errorMsg = 'Preencha e-mail e senha.';
      return;
    }

    this.carregando = true;

    const loginData = {
      email: this.email,
      senha: this.password,
    };

    this.authService.login(loginData.email, loginData.senha).subscribe({
      next: (res: any) => {
        this.carregando = false;
        alert('✅ Login efetuado com sucesso!');
        this.router.navigate(['/usuario']);
      },
      error: (err) => {
        this.carregando = false;
        console.error('Erro no login:', err);

        this.loginAttempts++;
        this.errorMsg = err?.error?.erro || 'E-mail ou senha inválidos.';
        alert(this.errorMsg);

        if (this.loginAttempts >= 1) {
          this.showRecoverPasswordSection = true;
        }
      },
    });
  }

  toggleRecoverPassword() {
    this.showRecoverPasswordSection = !this.showRecoverPasswordSection;
  }

  alterarSenha() {
    if (
      !this.emailRecuperacaoSenha || this.emailRecuperacaoSenha.trim() === ''
    ) {
      alert('Preencha todos os campos.');
      return;
    }
    this.authService.enviarEmailRecuperacao(this.emailRecuperacaoSenha).subscribe({
      next: () => {
        this.recoverMsg = 'Enviamos um email de recuperação senha no email ' + this.emailRecuperacaoSenha;
        alert(this.recoverMsg);
      },
      error: (err) => {
        console.error('Erro ao enviar email de recuperação:', err.mensage);
        this.recoverMsg = '❌ Erro ao enviar email de recuperação: '+ err.mensage;
        alert(this.recoverMsg);
      },
    });

  }
}
