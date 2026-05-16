import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Testa se o componente é criado
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Testa se o logo está sendo renderizado
  it('should render logo image', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const logo = compiled.querySelector('.logo-imagem img');
    expect(logo).toBeTruthy();
    expect(logo?.getAttribute('src')).toContain('/assets/logo.png');
  });

  // Testa se o título "FaculRide" aparece
  it('should render header title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.nometitulo h1 a');
    expect(title?.textContent).toContain('FaculRide');
  });

  // Testa se o menu tem os links corretos
  it('should have navigation links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.menu-list li a');
    const linkTexts = Array.from(links).map(link => link.textContent?.trim());

    expect(linkTexts).toContain('Ajuda');
    expect(linkTexts).toContain('Login');
    expect(linkTexts).toContain('Cadastre-se');
  });
});
