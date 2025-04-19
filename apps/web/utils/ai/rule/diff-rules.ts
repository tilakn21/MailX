import { z } from "zod";
import { createPatch } from "diff";
import { chatCompletionTools } from "@/utils/llms";
import type { UserAIFields } from "@/utils/llms/types";

const parameters = z.object({
  addedRules: z.array(z.string()).describe("The added rules"),
  editedRules: z
    .array(
      z.object({
        oldRule: z.string().describe("The old rule"),
        newRule: z.string().describe("The new rule"),
      }),
    )
    .describe("The edited rules"),
  removedRules: z.array(z.string()).describe("The removed rules"),
});

export async function aiDiffRules({
  user,
  oldPromptFile,
  newPromptFile,
}: {
  user: UserAIFields & { email: string };
  oldPromptFile: string;
  newPromptFile: string;
}) {
  const diff = createPatch("prompt", oldPromptFile, newPromptFile);

  const system =
    "You are an AI assistant that analyzes differences between two prompt files and identifies added, edited, and removed rules.";
  const prompt = `Analyze the following prompt files and their diff to identify the added, edited, and removed rules:

## Old prompt file:
${oldPromptFile}

## New prompt file:
${newPromptFile}

## Diff for guidance only:
${diff}

Please identify and return the rules that were added, edited, or removed, following these guidelines:
1. Return the full content of each rule, not just the changes.
2. For edited rules, include the new version in the 'editedRules' category ONLY.
3. Do NOT include edited rules in the 'addedRules' or 'removedRules' categories.
4. Treat any change to a rule, no matter how small, as an edit.
5. Ignore changes in whitespace or formatting unless they alter the rule's meaning.
6. If a rule is moved without other changes, do not categorize it as edited.

Organize your response using the 'diff_rules' function.

IMPORTANT: Do not include a rule in more than one category. If a rule is edited, do not include it in the 'removedRules' category!
If a rule is edited, it is an edit and not a removal! Be extra careful to not make this mistake.
`;

  const aiResponse = await chatCompletionTools({
    userAi: user,
    prompt,
    system,
    tools: {
      diff_rules: {
        description:
          "Analyze two prompt files and their diff to return the differences",
        parameters,
      },
    },
    userEmail: user.email,
    label: "Diff rules",
  });

  const parsedRules = aiResponse.toolCalls[0].args as z.infer<
    typeof parameters
  >;
  return parsedRules;
}
