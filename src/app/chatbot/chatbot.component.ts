import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ChatbotNode } from './chatbot-tree';
import { ChatbotService } from './chatbot.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent {
  isOpen = false;
  private currentNodeId: string;
  private history: string[] = [];

  constructor(private readonly chatbot: ChatbotService) {
    this.currentNodeId = this.chatbot.initialNodeId;
  }

  get currentNode(): ChatbotNode {
    return this.chatbot.getNode(this.currentNodeId);
  }

  get canGoBack(): boolean {
    return this.history.length > 0;
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  closeChat(): void {
    this.isOpen = false;
  }

  selectOption(target: string): void {
    this.history.push(this.currentNodeId);
    this.currentNodeId = target;
  }

  goBack(): void {
    const previousNode = this.history.pop();
    if (previousNode) {
      this.currentNodeId = previousNode;
    }
  }

  restart(): void {
    this.currentNodeId = this.chatbot.initialNodeId;
    this.history = [];
  }
}
