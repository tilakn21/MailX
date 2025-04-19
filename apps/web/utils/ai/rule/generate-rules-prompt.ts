import { z } from "zod";
import { chatCompletionTools } from "@/utils/llms";
import type { UserAIFields } from "@/utils/llms/types";
import type { User } from "@prisma/client";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("ai-generate-rules-prompt");

const parameters = z.object({
  rules: z
    .array(z.string())
    .describe("List of generated rules for email management"),
});

const parametersSnippets = z.object({
  rules: z
    .array(
      z.object({
        rule: z.string().describe("The rule to apply to the email"),
        snippet: z
          .string()
          .optional()
          .describe(
            "Optional: Include ONLY if this is a snippet-based rule. The exact snippet text this rule is based on.",
          ),
      }),
    )
    .describe("List of generated rules for email management"),
});

export async function aiGenerateRulesPrompt({
  user,
  lastSentEmails,
  snippets,
  userLabels,
}: {
  user: UserAIFields & Pick<User, "email" | "about">;
  lastSentEmails: string[];
  userLabels: string[];
  snippets: string[];
}): Promise<string[]> {
  const labelsList = userLabels
    ? userLabels
        .map((label) => `<label><name>${label}</name></label>`)
        .join("\n")
    : "No labels found";

  const hasSnippets = snippets.length > 0;

  // When using snippets, we show fewer emails to the AI to avoid overwhelming it
  const lastSentEmailsCount = hasSnippets ? 20 : 50;

  const system =
    "You are an AI assistant that helps people manage their emails by generating rules based on their email behavior and existing labels.";

  const prompt = `Analyze the user's email behavior and suggest general rules for managing their inbox effectively. Here's the context:

<user_email>
${user.email}
</user_email>
${user.about ? `\n<about_user>\n${user.about}\n</about_user>\n` : ""}
<last_sent_emails>
${lastSentEmails
  .slice(0, lastSentEmailsCount)
  .map((email) => `<email>\n${email}\n</email>`)
  .join("\n")}
</last_sent_emails>
${
  hasSnippets
    ? `<user_snippets>\n${snippets
        .map((snippet) => `<snippet>\n${snippet}\n</snippet>`)
        .join("\n")}\n</user_snippets>`
    : ""
}
<user_labels>
${labelsList}
</user_labels>

<instructions>
Generate a list of email management rules that would be broadly applicable for this user based on their email behavior and existing labels. The rules should be general enough to apply to various situations, not just specific recent emails. Include actions such as labeling, archiving, forwarding, replying, and drafting responses.
</instructions>

<example_rules>
* Label newsletters as "Newsletter" and archive them
* If someone asks to schedule a meeting, send them your calendar link
* For cold emails or unsolicited pitches, draft a polite decline response
* Label emails related to financial matters as "Finance" and mark as important
* Forward emails about technical issues to the support team
* For emails from key clients or partners, label as "VIP" and keep in inbox
</example_rules>

Focus on creating rules that will help the user organize their inbox more efficiently, save time, and automate responses where appropriate. Consider the following aspects:

1. Labeling and organizing emails by general categories (e.g., Work, Personal, Finance)
2. Handling common types of requests (e.g., meeting requests, support inquiries)
3. Automating responses for recurring scenarios
4. Forwarding specific types of emails to relevant team members
5. Prioritizing important or urgent emails
6. Dealing with newsletters, marketing emails, and potential spam
${
  hasSnippets
    ? "7. Add a rule for each snippet. IMPORTANT: Include the full text of the snippet in your output. The output can be multiple paragraphs long when using snippets."
    : ""
}

IMPORTANT: Our system can only perform email management actions (labeling, archiving, forwarding, drafting responses). We cannot add events to calendars or create todo list items. Do not suggest rules that include these actions.

Your response should only include the list of general rules. Aim for 3-10 broadly applicable rules that would be useful for this user's email management.`;

  logger.trace("generate-rules-prompt", { system, prompt });

  const aiResponse = await chatCompletionTools({
    userAi: user,
    prompt,
    system,
    tools: {
      generate_rules: {
        description: "Generate a list of email management rules",
        parameters: hasSnippets ? parametersSnippets : parameters,
      },
    },
    userEmail: user.email || "",
    label: "Generate rules prompt",
  });

  const args = aiResponse.toolCalls[0].args;

  logger.trace("Args", { args });

  return parseRulesResponse(args, hasSnippets);
}

function parseRulesResponse(args: unknown, hasSnippets: boolean): string[] {
  if (hasSnippets) {
    const parsedRules = args as z.infer<typeof parametersSnippets>;
    return parsedRules.rules.map(({ rule, snippet }) =>
      snippet ? `${rule}\n---\n${snippet}\n---\n` : rule,
    );
  }

  const parsedRules = args as z.infer<typeof parameters>;
  return parsedRules.rules;
}
