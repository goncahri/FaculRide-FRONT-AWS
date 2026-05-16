import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsuarioComponent } from './usuario.component';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';

describe('UsuarioComponent', () => {
  let component: UsuarioComponent;
  let fixture: ComponentFixture<UsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuarioComponent, CommonModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente Usuario', () => {
    expect(component).toBeTruthy();
  });

  it('deve renderizar o texto de boas-vindas', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.boas-vindas p')?.textContent).toContain('que bom que você voltou');
  });

  it('deve ter o campo "Solicite uma carona"', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.formulario-carona h1')?.textContent).toContain('Solicite uma carona');
  });
});
