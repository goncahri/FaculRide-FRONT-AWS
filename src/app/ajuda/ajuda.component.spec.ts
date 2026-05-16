import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AjudaComponent } from './ajuda.component';

describe('AjudaComponent', () => {
  let component: AjudaComponent;
  let fixture: ComponentFixture<AjudaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AjudaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AjudaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve conter o título "Ajuda"', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Ajuda');
  });

  it('deve listar pelo menos uma pergunta no FAQ', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('details').length).toBeGreaterThan(0);
  });
});
