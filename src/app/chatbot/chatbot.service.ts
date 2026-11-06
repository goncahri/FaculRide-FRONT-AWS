import { Injectable } from '@angular/core';
import { CHATBOT_INITIAL_NODE, CHATBOT_TREE, ChatbotNode } from './chatbot-tree';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  readonly initialNodeId = CHATBOT_INITIAL_NODE;

  getNode(id: string): ChatbotNode {
    return CHATBOT_TREE[id] ?? CHATBOT_TREE[this.initialNodeId];
  }
}
