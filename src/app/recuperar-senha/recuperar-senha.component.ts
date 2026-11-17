import { UsuariosService } from './../services/usuarios.service';
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators,} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-recuperar-senha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './recuperar-senha.component.html',
  styleUrl: './recuperar-senha.component.css'
})
export class RecuperarSenhaComponent implements OnInit{
  private formBuilder = inject(FormBuilder);
  private ActiveRouter = inject(ActivatedRoute);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router)
  private token:string = '';
  private senhaForteRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  recuperarSenhaForm = this.formBuilder.group({
    senha: ['',[Validators.required, Validators.pattern(this.senhaForteRegex)]],
    confirmarSenha: ['',[Validators.required]],
  })
  ngOnInit(): void {
    this.token = this.ActiveRouter.snapshot.paramMap.get('token') ?? '';
    if(!this.token){
      this.router.navigate(['home'])
    }
  }
  redefinirSenha() {
    this.usuariosService.redefinirSenha(this.token, this.recuperarSenhaForm.controls.senha.value as string).subscribe({
      next:()=>{
        alert("redefinição de senha foi um sucesso");
        this.router.navigate(['login'])
      },
      error:(err)=>{
        alert(`Erro ao redefinir senha: ${err.message}`)
      }
    })
  }
}
