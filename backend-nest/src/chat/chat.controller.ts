import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ChatService } from './chat.service';
import { AiService, ChatEvent } from './ai.service';
import { ChatMessageCreateDto } from './dto/chat-message-create.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly aiService: AiService,
  ) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  createSession(@CurrentUser() user: User) {
    return this.chatService.createSession(user.id);
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: User) {
    return this.chatService.listSessions(user.id);
  }

  @Get('sessions/:id')
  getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.chatService.getSession(id, user.id);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.chatService.deleteSession(id, user.id);
  }

  @Post('sessions/:id/messages')
  async sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChatMessageCreateDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const session = await this.chatService.getSession(id, user.id);

    await this.chatService.addMessage(session.id, 'user', dto.content);

    const history = [
      ...(session.messages ?? []).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: dto.content },
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let fullResponse = '';

    for await (const event of this.aiService.generateChatResponse(history)) {
      if (event.event === 'done') {
        fullResponse = (event.data.text as string) ?? '';
      }
      res.write(formatSseEvent(event));
    }

    if (fullResponse) {
      await this.chatService.addMessage(session.id, 'assistant', fullResponse);
    }

    res.end();
  }
}

function formatSseEvent(event: ChatEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}
