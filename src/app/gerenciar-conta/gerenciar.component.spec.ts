import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GerenciarComponent } from './gerenciar.component';

describe('GerenciarContaComponent', () => {
  let component: GerenciarComponent;
  let fixture: ComponentFixture<GerenciarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GerenciarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GerenciarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
