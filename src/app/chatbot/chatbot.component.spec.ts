import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatbotComponent } from './chatbot.component';

describe('ChatbotComponent', () => {
  let component: ChatbotComponent;
  let fixture: ComponentFixture<ChatbotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ChatbotComponent] }).compileComponents();
    fixture = TestBed.createComponent(ChatbotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts closed at the initial menu', () => {
    expect(component.isOpen).toBeFalse();
    expect(component.currentNode.title).toBe('Como posso ajudar?');
  });

  it('navigates only through configured options and can go back', () => {
    component.selectOption('sobre');
    expect(component.currentNode.title).toBe('Sobre o FaculRide');
    expect(component.canGoBack).toBeTrue();

    component.goBack();
    expect(component.currentNode.title).toBe('Como posso ajudar?');
  });

  it('restarts the conversation', () => {
    component.selectOption('conta');
    component.restart();
    expect(component.currentNode.title).toBe('Como posso ajudar?');
    expect(component.canGoBack).toBeFalse();
  });
});
