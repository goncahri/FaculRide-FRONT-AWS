import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Testa se o componente é criado
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Testa se o título do footer aparece
  it('should render footer title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const titleElement = compiled.querySelector('.footer-title');
    expect(titleElement?.textContent).toContain('FaculRide');
  });

  // Testa se os contatos aparecem
  it('should display contact info', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('+55 (15) 98765-4321');
    expect(compiled.textContent).toContain('wigroup');
  });

  // Testa se existem os links principais
  it('should have links for developers, login, and cadastro', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.footer-links a');
    const linkTexts = Array.from(links).map(link => link.textContent?.trim());

    expect(linkTexts).toContain('Desenvolvedores');
    expect(linkTexts).toContain('Login');
    expect(linkTexts).toContain('Cadastre-se');
  });
});
