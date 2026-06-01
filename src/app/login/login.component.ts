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

  senhaAtual: string = '';
  novaSenha: string = '';
  confirmarSenha: string = '';

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
      !this.senhaAtual ||
      !this.novaSenha ||
      !this.confirmarSenha
    ) {
      alert('Preencha todos os campos.');
      return;
    }

    this.authService.alterarSenha({
      senhaAtual: this.senhaAtual,
      novaSenha: this.novaSenha,
      confirmarSenha: this.confirmarSenha
    }).subscribe({
      next: () => {
        alert('✅ Senha alterada com sucesso!');

        this.senhaAtual = '';
        this.novaSenha = '';
        this.confirmarSenha = '';

        this.showRecoverPasswordSection = false;
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.erro || 'Erro ao alterar senha.');
      }
    });
  }
}