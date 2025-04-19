import { z } from "zod";
import {
  ActionType,
  CategoryFilterType,
  LogicalOperator,
} from "@prisma/client";

const conditionSchema = z
  .object({
    conditionalOperator: z
      .enum([LogicalOperator.AND, LogicalOperator.OR])
      .optional()
      .describe(
        "The conditional operator to use. AND means all conditions must be true for the rule to match. OR means any condition can be true for the rule to match. This does not impact sub-conditions.",
      ),
    aiInstructions: z
      .string()
      .optional()
      .describe(
        "Instructions for the AI to determine when to apply this rule. For example: 'Apply this rule to emails about product updates' or 'Use this rule for messages discussing project deadlines'. Be specific about the email content or characteristics that should trigger this rule.",
      ),
    static: z
      .object({
        from: z.string().optional().describe("The from email address to match"),
        to: z.string().optional().describe("The to email address to match"),
        subject: z.string().optional().describe("The subject to match"),
      })
      .optional()
      .describe(
        "The static conditions to match. If multiple static conditions are specified, the rule will match if ALL of the conditions match (AND operation)",
      ),
  })
  .describe("The conditions to match");

export const createRuleSchema = z.object({
  name: z
    .string()
    .describe("The name of the rule. No need to include 'Rule' in the name."),
  condition: conditionSchema,
  actions: z
    .array(
      z.object({
        type: z.nativeEnum(ActionType).describe("The type of the action"),
        fields: z
          .object({
            label: z
              .string()
              .nullish()
              .transform((v) => v ?? null)
              .describe("The label to apply to the email"),
            to: z
              .string()
              .nullish()
              .transform((v) => v ?? null)
              .describe("The to email address to send the email to"),
            cc: z
              .string()
              .nullish()
              .transform((v) => v ?? null)
              .describe("The cc email address to send the email to"),
            bcc: z
              .string()
              .nullish()
              .transform((v) => v ?? null)
              .describe("The bcc email address to send the email to"),
            subject: z
              .string()
              .nullish()
              .transform((v) => v ?? null)
              .describe("The subject of the email"),
            content: z
              .string()
              .nullish()
              .transform((v) => v ?? null)
              .describe("The content of the email"),
            webhookUrl: z
              .string()
              .nullish()
              .transform((v) => v ?? null)
              .describe("The webhook URL to call"),
          })
          .optional()
          .describe(
            "The fields to use for the action. Static text can be combined with dynamic values using double braces {{}}. For example: 'Hi {{sender's name}}' or 'Re: {{subject}}' or '{{when I'm available for a meeting}}'. Dynamic values will be replaced with actual email data when the rule is executed. Dynamic values are generated in real time by the AI. Only use dynamic values where absolutely necessary. Otherwise, use plain static text. A field can be also be fully static or fully dynamic.",
          ),
      }),
    )
    .describe("The actions to take"),
});

export const getCreateRuleSchemaWithCategories = (
  availableCategories: [string, ...string[]],
) => {
  return createRuleSchema.extend({
    condition: conditionSchema.extend({
      categories: z
        .object({
          categoryFilterType: z
            .enum([CategoryFilterType.INCLUDE, CategoryFilterType.EXCLUDE])
            .optional()
            .describe(
              "Whether senders in `categoryFilters` should be included or excluded",
            ),
          categoryFilters: z
            .array(z.string())
            .optional()
            .describe(
              `The categories to match. If multiple categories are specified, the rule will match if ANY of the categories match (OR operation). Available categories: ${availableCategories
                .map((c) => `"${c}"`)
                .join(", ")}`,
            ),
        })
        .optional()
        .describe("The categories to match or skip"),
    }),
  });
};

type CreateRuleSchema = z.infer<typeof createRuleSchema>;
export type CreateRuleSchemaWithCategories = CreateRuleSchema & {
  condition: CreateRuleSchema["condition"] & {
    categories?: {
      categoryFilterType: CategoryFilterType;
      categoryFilters: string[];
    };
  };
};
export type CreateOrUpdateRuleSchemaWithCategories =
  CreateRuleSchemaWithCategories & {
    ruleId?: string;
  };
