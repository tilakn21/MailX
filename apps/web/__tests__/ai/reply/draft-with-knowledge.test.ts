import { describe, expect, test, vi } from "vitest";
import { aiDraftWithKnowledge } from "@/utils/ai/reply/draft-with-knowledge";
import type { UserEmailWithAI } from "@/utils/llms/types";
import type { EmailForLLM } from "@/utils/types";

// Run with: pnpm test-ai draft-with-knowledge

vi.mock("server-only", () => ({}));

const isAiTest = process.env.RUN_AI_TESTS === "true";
const TEST_TIMEOUT = 15_000;

describe.runIf(isAiTest)("aiDraftWithKnowledge", () => {
  test(
    "successfully drafts a reply with knowledge and history",
    async () => {
      const user = getUser();
      const messages = getMessages(2);
      const knowledgeBaseContent = "Relevant knowledge point.";
      const emailHistorySummary = "Previous interaction summary.";

      const result = await aiDraftWithKnowledge({
        messages,
        user,
        knowledgeBaseContent,
        emailHistorySummary,
        writingStyle: null,
      });

      // Check that the result is a non-empty string
      expect(result).toBeTypeOf("string");
      if (typeof result === "string") {
        expect(result.length).toBeGreaterThan(0);
      }
      console.debug("Generated reply (with knowledge/history):\n", result);
    },
    TEST_TIMEOUT,
  );

  test(
    "successfully drafts a reply without knowledge or history",
    async () => {
      const user = getUser({ about: null });
      const messages = getMessages(1);

      const result = await aiDraftWithKnowledge({
        messages,
        user,
        knowledgeBaseContent: null,
        emailHistorySummary: null,
        writingStyle: null,
      });

      // Check that the result is a non-empty string
      expect(result).toBeTypeOf("string");
      if (typeof result === "string") {
        expect(result.length).toBeGreaterThan(0);
      }
      console.debug("Generated reply (no knowledge/history):\n", result);
    },
    TEST_TIMEOUT,
  );
});

function getUser(overrides: Partial<UserEmailWithAI> = {}): UserEmailWithAI {
  return {
    id: "user-123",
    email: "user@example.com",
    aiModel: null,
    aiProvider: null,
    aiApiKey: null,
    about: "I am a user.",
    ...overrides,
  };
}

type TestMessage = EmailForLLM & { to: string };

function getMessages(count = 1): TestMessage[] {
  const messages: TestMessage[] = [];
  for (let i = 0; i < count; i++) {
    messages.push({
      id: `msg-${i + 1}`,
      from: i % 2 === 0 ? "sender@example.com" : "user@example.com",
      to: i % 2 === 0 ? "user@example.com" : "recipient@example.com",
      subject: `Test Subject ${i + 1}`,
      date: new Date(Date.now() - (count - i) * 60000), // Messages spaced 1 minute apart
      content: `Test Content ${i + 1}`,
    });
  }
  return messages;
}
