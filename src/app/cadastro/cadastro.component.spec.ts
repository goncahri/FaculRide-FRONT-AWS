import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CadastroComponent } from './cadastro.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';

describe('CadastroComponent', () => {
  let component: CadastroComponent;
  let fixture: ComponentFixture<CadastroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastroComponent, ReactiveFormsModule, CommonModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CadastroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve ter um formulário válido quando todos os campos obrigatórios são preenchidos corretamente', () => {
    component.cadastroForm.patchValue({
      tipoUsuario: 'motorista',
      nome: 'João da Silva',
      cpf: '12345678901',
      email: 'joao@email.com',
      telefone: '11912345678',
      endereco: 'Rua A, 123',
      fatec: 'FATEC Sorocaba',
      ra: '123456789',
      genero: 'Masculino',
      dataNascimento: '2000-01-01',
      senha: '123456',
      cnh: '123.456.789-00',
      modeloCarro: 'Onix',
      anoCarro: '2023',
      placa: 'ABC1234'
    });

    component.alternarCamposMotorista(); // garante validações extras
    expect(component.cadastroForm.valid).toBeTrue();
  });

  it('deve marcar o formulário como inválido se o CPF estiver faltando', () => {
    component.cadastroForm.patchValue({
      nome: 'Maria',
      cpf: '', // <-- obrigatório
      email: 'maria@email.com',
      telefone: '11912345678',
      endereco: 'Rua B',
      fatec: 'FATEC Votorantim',
      ra: '123456789',
      genero: 'Feminino',
      dataNascimento: '2001-02-01',
      senha: '654321'
    });

    expect(component.cadastroForm.invalid).toBeTrue();
  });
});

