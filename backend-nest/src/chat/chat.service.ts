import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionsRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messagesRepo: Repository<ChatMessage>,
  ) {}

  async createSession(userId: string): Promise<ChatSession> {
    const session = this.sessionsRepo.create({ user_id: userId });
    const saved = await this.sessionsRepo.save(session);
    saved.messages = [];
    return saved;
  }

  async listSessions(userId: string): Promise<ChatSession[]> {
    return this.sessionsRepo.find({
      where: { user_id: userId },
      relations: ['messages'],
      order: { created_at: 'DESC', messages: { created_at: 'ASC' } },
    });
  }

  async getSession(sessionId: string, userId: string): Promise<ChatSession> {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId, user_id: userId },
      relations: ['messages'],
      order: { messages: { created_at: 'ASC' } },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return session;
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId, user_id: userId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    await this.sessionsRepo.remove(session);
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<ChatMessage> {
    const message = this.messagesRepo.create({
      session_id: sessionId,
      role,
      content,
    });
    return this.messagesRepo.save(message);
  }
}
