import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapaComponent } from './mapa.component';

describe('MapaComponent', () => {
  let component: MapaComponent;
  let fixture: ComponentFixture<MapaComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapaComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MapaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve renderizar o título "Planeje sua Carona"', () => {
    const titulo = compiled.querySelector('h2');
    expect(titulo?.textContent).toContain('Planeje sua Carona');
  });

  it('deve ter o seletor com as opções "Oferecer" e "Procurar"', () => {
    const select = compiled.querySelector('select');
    expect(select).toBeTruthy();
    const options = select?.querySelectorAll('option') || [];
    const values = Array.from(options).map(opt => opt.textContent?.toLowerCase());
    expect(values).toContain('oferecer carona');
    expect(values).toContain('procurar carona');
  });

  it('deve exibir "Caronas Oferecidas" por padrão', () => {
    const faixa = compiled.querySelector('.minhas-caronas-faixa h3');
    expect(faixa?.textContent).toContain('Caronas Oferecidas');
  });
});

