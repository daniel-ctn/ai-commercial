export class ChatMessageResponseDto {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: Date;
}

export class ChatSessionResponseDto {
  id: string;
  user_id: string;
  created_at: Date;
  messages: ChatMessageResponseDto[];
}
