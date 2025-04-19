import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { chatCompletionTools } from "@/utils/llms";
import type { UserAIFields } from "@/utils/llms/types";
import {
  createRuleSchema,
  getCreateRuleSchemaWithCategories,
  type CreateOrUpdateRuleSchemaWithCategories,
} from "@/utils/ai/rule/create-rule-schema";
import { createScopedLogger } from "@/utils/logger";
import { env } from "@/env";

const logger = createScopedLogger("ai-prompt-to-rules");

const updateRuleSchema = createRuleSchema.extend({
  ruleId: z.string().optional(),
});

export async function aiPromptToRules({
  user,
  promptFile,
  isEditing,
  availableCategories,
}: {
  user: UserAIFields & { email: string };
  promptFile: string;
  isEditing: boolean;
  availableCategories?: string[];
}) {
  function getSchema() {
    if (availableCategories?.length) {
      const createRuleSchemaWithCategories = getCreateRuleSchemaWithCategories(
        availableCategories as [string, ...string[]],
      );
      const updateRuleSchemaWithCategories =
        createRuleSchemaWithCategories.extend({
          ruleId: z.string().optional(),
        });

      return isEditing
        ? updateRuleSchemaWithCategories
        : createRuleSchemaWithCategories;
    }
    return isEditing ? updateRuleSchema : createRuleSchema;
  }

  const schema = getSchema();

  const parameters = z.object({
    rules: z
      .array(schema)
      .describe("The parsed rules list from the prompt file"),
  });

  const system = getSystemPrompt({
    hasSmartCategories: !!availableCategories?.length,
  });

  const prompt = `Convert the following prompt file into rules:
  
<prompt>
${promptFile}
</prompt>`;

  if (env.NODE_ENV === "development") {
    logger.trace("Input", {
      system,
      prompt,
      parameters: zodToJsonSchema(parameters),
    });
  }

  const aiResponse = await chatCompletionTools({
    userAi: user,
    prompt,
    system,
    tools: {
      parse_rules: {
        description: "Parse rules from prompt file",
        parameters,
      },
    },
    userEmail: user.email,
    label: "Prompt to rules",
  });

  const { rules } = aiResponse.toolCalls[0].args as {
    rules: CreateOrUpdateRuleSchemaWithCategories[];
  };

  logger.trace("Output", { rules });

  return rules;
}

function getSystemPrompt({
  hasSmartCategories,
}: {
  hasSmartCategories: boolean;
}) {
  return `You are an AI assistant that converts email management rules into a structured format. Parse the given prompt file and conver them into rules.

IMPORTANT: If a user provides a snippet, use that full snippet in the rule. Don't include placeholders unless it's clear one is needed.

You can use multiple conditions in a rule, but aim for simplicity.
In most cases, you should use the "aiInstructions" and sometimes you will use other fields in addition.
If a rule can be handled fully with static conditions, do so, but this is rarely possible.

<examples>
  <example>
    <input>
      When I get a newsletter, archive it and label it as "Newsletter"
    </input>
    <output>
      {
        "rules": [{
          "name": "Label Newsletters",
          "condition": {
            "aiInstructions": "Apply this rule to newsletters"
            ${
              hasSmartCategories
                ? `,
              "categories": {
                "categoryFilterType": "INCLUDE",
                "categoryFilters": ["Newsletters"]
              },
              "conditionalOperator": "OR"`
                : ""
            }
          },
          "actions": [
            {
              "type": "ARCHIVE"
            },
            {
              "type": "LABEL",
              "fields": {
                "label": "Newsletter"
              }
            }
          ]
        }]
      }
    </output>
  </example>

  <example>
    <input>
      When someone mentions system outages or critical issues, forward to urgent-support@company.com and label as Urgent-Support
    </input>
    <output>
      {
        "rules": [{
          "name": "Forward Urgent Emails",
          "condition": {
            "aiInstructions": "Apply this rule to emails mentioning system outages or critical issues"
          },
          "actions": [
            {
              "type": "FORWARD",
              "fields": {
                "to": "urgent-support@company.com"
              }
            },
            {
              "type": "LABEL",
              "fields": {
                "label": "Urgent-Support"
              }
            }
          ]
        }]
      }
    </output>
  </example>

  <example>
    <input>
      Label all urgent emails from company.com as "Urgent"
    </input>
    <output>
      {
        "rules": [{
          "name": "Matt Urgent Emails",
          "condition": {
            "conditionalOperator": "AND",
            "aiInstructions": "Apply this rule to urgent emails",
            "static": {
              "from": "@company.com"
            }
          },
          "actions": [
            {
              "type": "LABEL",
              "fields": {
                "label": "Urgent"
              }
            }
          ]
        }]
      }
    </output>
  </example>

  <example>
    <input>
      If someone asks to set up a call, draft a reply with my calendar link: https://cal.com/example using the following format:
      
      """
      Hi [name],
      Thank you for your message. I'll respond within 2 hours.
      Best,
      Alice
      """
    </input>
    <output>
      {
        "rules": [{
          "name": "Reply to Call Requests",
          "condition": {
            "aiInstructions": "Apply this rule to emails from people asking to set up a call"
          },
          "actions": [
            {
              "type": "REPLY",
              "fields": {
                "content": "Hi {{name}},\nThank you for your message.\nI'll respond within 2 hours.\nBest,\nAlice"
              }
            }
          ]
        }]
      }
    </output>
  </example>
</examples>
`;
}
