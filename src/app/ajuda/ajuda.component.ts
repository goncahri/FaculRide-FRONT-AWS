import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ajuda',
  standalone: true,
  templateUrl: './ajuda.component.html',
  styleUrls: ['./ajuda.component.css'],
  imports: [CommonModule, FormsModule]
})
export class AjudaComponent {
  mensagemSucesso = false;
  erroFormulario = false;

  enviarFormulario(form: NgForm) {
    if (form.valid) {
      this.mensagemSucesso = true;
      this.erroFormulario = false;
      form.resetForm();

      setTimeout(() => {
        this.mensagemSucesso = false;
      }, 5000);
    } else {
      this.erroFormulario = true;

      setTimeout(() => {
        this.erroFormulario = false;
      }, 5000);
    }
  }
}



