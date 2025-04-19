import { FormSection, FormSectionLeft } from "@/components/Form";
import { Card } from "@/components/ui/card";
import { CopyInput } from "@/components/CopyInput";
import { RegenerateSecretButton } from "@/app/(app)/settings/WebhookGenerate";

export async function WebhookSection({
  webhookSecret,
}: {
  webhookSecret: string | null;
}) {
  return (
    <FormSection>
      <FormSectionLeft
        title="Webhooks (Developers)"
        description="API webhook secret for request verification. Include this in the X-Webhook-Secret header when setting up webhook endpoints."
      />

      <div className="col-span-2">
        <Card className="p-6">
          <div className="space-y-4">
            {!!webhookSecret && <CopyInput value={webhookSecret} />}

            <RegenerateSecretButton hasSecret={!!webhookSecret} />
          </div>
        </Card>
      </div>
    </FormSection>
  );
}
