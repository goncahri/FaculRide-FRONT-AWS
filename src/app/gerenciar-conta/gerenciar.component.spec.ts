import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GerenciarContaComponent } from './gerenciar.component';

describe('GerenciarContaComponent', () => {
  let component: GerenciarContaComponent;
  let fixture: ComponentFixture<GerenciarContaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GerenciarContaComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GerenciarContaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
