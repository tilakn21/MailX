import { z } from "zod";
import type { UserEmailWithAI } from "@/utils/llms/types";
import { chatCompletionObject } from "@/utils/llms";
import { stringifyEmail } from "@/utils/stringify-email";
import type { EmailForLLM } from "@/utils/types";
import { createScopedLogger } from "@/utils/logger";
import { Braintrust } from "@/utils/braintrust";

const logger = createScopedLogger("ai-choose-rule");

const braintrust = new Braintrust("choose-rule-2");

type GetAiResponseOptions = {
  email: EmailForLLM;
  user: UserEmailWithAI;
  rules: { name: string; instructions: string }[];
};

async function getAiResponse(options: GetAiResponseOptions) {
  const { email, user, rules } = options;

  const emailSection = stringifyEmail(email, 500);

  const system = `You are an AI assistant that helps people manage their emails.

<instructions>
  IMPORTANT: Follow these instructions carefully when selecting a rule:

  <priority>
  1. Match the email to a SPECIFIC user-defined rule that addresses the email's exact content or purpose.
  2. If the email doesn't match any specific rule but the user has a catch-all rule (like "emails that don't match other criteria"), use that catch-all rule.
  3. Only set "noMatchFound" to true if no user-defined rule can reasonably apply.
  </priority>

  <guidelines>
  - If a rule says to exclude certain types of emails, DO NOT select that rule for those excluded emails.
  - When multiple rules match, choose the more specific one that best matches the email's content.
  - Rules about requiring replies should be prioritized when the email clearly needs a response.
  </guidelines>
</instructions>

<user_rules>
${rules
  .map(
    (rule) => `<rule>
  <name>${rule.name}</name>
  <criteria>${rule.instructions}</criteria>
</rule>`,
  )
  .join("\n")}
</user_rules>

${
  user.about
    ? `<user_info>
<about>${user.about}</about>
<email>${user.email}</email>
</user_info>`
    : `<user_info>
<email>${user.email}</email>
</user_info>`
}

<outputFormat>
Respond with a JSON object with the following fields:
"reason" - the reason you chose that rule. Keep it concise.
"ruleName" - the exact name of the rule you want to apply
"noMatchFound" - true if no match was found, false otherwise
</outputFormat>`;

  const prompt = `Select a rule to apply to this email that was sent to me:

<email>
${emailSection}
</email>`;

  logger.trace("Input", { system, prompt });

  const aiResponse = await chatCompletionObject({
    userAi: user,
    messages: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    schema: z.object({
      reason: z.string(),
      ruleName: z.string(),
      noMatchFound: z.boolean().optional(),
    }),
    userEmail: user.email || "",
    usageLabel: "Choose rule",
  });

  logger.trace("Response", aiResponse.object);

  braintrust.insertToDataset({
    id: email.id,
    input: {
      email: emailSection,
      rules: rules.map((rule) => ({
        name: rule.name,
        instructions: rule.instructions,
      })),
      hasAbout: !!user.about,
      userAbout: user.about,
      userEmail: user.email,
    },
    expected: aiResponse.object.ruleName,
  });

  return aiResponse.object;
}

export async function aiChooseRule<
  T extends { name: string; instructions: string },
>(options: { email: EmailForLLM; rules: T[]; user: UserEmailWithAI }) {
  const { email, rules, user } = options;

  if (!rules.length) return { reason: "No rules" };

  const aiResponse = await getAiResponse({
    email,
    rules,
    user,
  });

  if (aiResponse.noMatchFound)
    return { rule: undefined, reason: "No match found" };

  const selectedRule = aiResponse.ruleName
    ? rules.find(
        (rule) => rule.name.toLowerCase() === aiResponse.ruleName.toLowerCase(),
      )
    : undefined;

  return {
    rule: selectedRule,
    reason: aiResponse?.reason,
  };
}
