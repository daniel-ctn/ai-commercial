import assert from 'node:assert/strict';
import test from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';

function createChatService() {
  const sessions: Array<{
    id: string;
    user_id: string;
    created_at: Date;
    messages: Array<{ id: string; session_id: string; role: string; content: string; created_at: Date }>;
  }> = [];

  const messages: Array<{
    id: string;
    session_id: string;
    role: string;
    content: string;
    created_at: Date;
  }> = [];

  let idCounter = 0;

  const sessionsRepo = {
    create: (data: { user_id: string }) => ({
      ...data,
      id: `session-${++idCounter}`,
      created_at: new Date(),
      messages: [],
    }),
    save: async (session: (typeof sessions)[number]) => {
      const idx = sessions.findIndex((s) => s.id === session.id);
      if (idx >= 0) {
        sessions[idx] = session;
      } else {
        sessions.push(session);
      }
      return session;
    },
    find: async (opts: { where: { user_id: string } }) => {
      return sessions
        .filter((s) => s.user_id === opts.where.user_id)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    },
    findOne: async (opts: { where: { id: string; user_id?: string } }) => {
      return (
        sessions.find(
          (s) =>
            s.id === opts.where.id &&
            (!opts.where.user_id || s.user_id === opts.where.user_id),
        ) ?? null
      );
    },
    remove: async (session: (typeof sessions)[number]) => {
      const idx = sessions.findIndex((s) => s.id === session.id);
      if (idx >= 0) sessions.splice(idx, 1);
    },
  };

  const messagesRepo = {
    create: (data: { session_id: string; role: string; content: string }) => ({
      ...data,
      id: `msg-${++idCounter}`,
      created_at: new Date(),
    }),
    save: async (msg: (typeof messages)[number]) => {
      messages.push(msg);
      return msg;
    },
  };

  return {
    service: new ChatService(sessionsRepo as never, messagesRepo as never),
    sessions,
    messages,
  };
}

test('createSession creates a session for the given user', async () => {
  const { service } = createChatService();

  const session = await service.createSession('user-1');

  assert.equal(session.user_id, 'user-1');
  assert.ok(session.id);
  assert.deepEqual(session.messages, []);
});

test('listSessions returns only sessions for the specified user', async () => {
  const { service } = createChatService();

  await service.createSession('user-1');
  await service.createSession('user-1');
  await service.createSession('user-2');

  const user1Sessions = await service.listSessions('user-1');
  const user2Sessions = await service.listSessions('user-2');

  assert.equal(user1Sessions.length, 2);
  assert.equal(user2Sessions.length, 1);
});

test('getSession returns session only if user owns it', async () => {
  const { service } = createChatService();

  const session = await service.createSession('user-1');
  const found = await service.getSession(session.id, 'user-1');

  assert.equal(found.id, session.id);
});

test('getSession throws NotFoundException for wrong user', async () => {
  const { service } = createChatService();

  const session = await service.createSession('user-1');

  await assert.rejects(
    service.getSession(session.id, 'user-2'),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      assert.equal(error.message, 'Chat session not found');
      return true;
    },
  );
});

test('getSession throws NotFoundException for nonexistent session', async () => {
  const { service } = createChatService();

  await assert.rejects(
    service.getSession('nonexistent', 'user-1'),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      return true;
    },
  );
});

test('deleteSession removes session only if user owns it', async () => {
  const { service, sessions } = createChatService();

  const session = await service.createSession('user-1');
  assert.equal(sessions.length, 1);

  await service.deleteSession(session.id, 'user-1');
  assert.equal(sessions.length, 0);
});

test('deleteSession throws NotFoundException for wrong user', async () => {
  const { service } = createChatService();

  const session = await service.createSession('user-1');

  await assert.rejects(
    service.deleteSession(session.id, 'user-2'),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      return true;
    },
  );
});

test('addMessage saves a message to the session', async () => {
  const { service, messages } = createChatService();

  const session = await service.createSession('user-1');
  const msg = await service.addMessage(session.id, 'user', 'Hello!');

  assert.equal(msg.session_id, session.id);
  assert.equal(msg.role, 'user');
  assert.equal(msg.content, 'Hello!');
  assert.equal(messages.length, 1);
});
