"use client";

import { useCallback } from "react";
import Link from "next/link";
import { type SubmitHandler, useFieldArray, useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import { usePostHog } from "posthog-js/react";
import { CrownIcon } from "lucide-react";
import { capitalCase } from "capital-case";
import { Button } from "@/components/ui/button";
import { FormSection, FormSectionLeft } from "@/components/Form";
import { Input } from "@/components/Input";
import { LoadingContent } from "@/components/LoadingContent";
import {
  saveMultiAccountextraBody,
  type SaveMultiAccountextraBody,
} from "@/app/api/user/settings/multi-account/validation";
import {
  claimextraAdminAction,
  updateMultiAccountextraAction,
} from "@/utils/actions/extra";
import type { MultiAccountEmailsResponse } from "@/app/api/user/settings/multi-account/route";
import { AlertBasic, AlertWithButton } from "@/components/Alert";
import { useExtra } from "@/components/ExtraAlert";
import { ExtraFeaturesAdditonalEmail } from "@/utils/extra-features";
import { extraTier } from "@prisma/client";
import { env } from "@/env";
import { getUserTier, isAdminForExtra } from "@/utils/extra-features";
import { useExtraModal } from "@/components/ExtraModal";
import { handleActionResult } from "@/utils/server-action";

export function MultiAccountSection() {
  const { data: session } = useSession();
  const { data, isLoading, error, mutate } = useSWR<MultiAccountEmailsResponse>(
    "/api/user/settings/multi-account",
  );
  const {
    isExtra,
    data: dataextra,
    isLoading: isLoadingextra,
    error: errorextra,
  } = useExtra();

  const extraTier = getUserTier(dataextra?.extra);

  const { openModal, ExtraModal } = useExtraModal();

  if (isExtra && !isAdminForExtra(data?.admins || [], session?.user.id || ""))
    return null;

  return (
    <FormSection id="manage-users">
      <FormSectionLeft
        title="Share extra"
        description="Share extra with other email accounts. This does not give other accounts access to read your emails."
      />

      <LoadingContent loading={isLoadingextra} error={errorextra}>
        {isExtra ? (
          <LoadingContent loading={isLoading} error={error}>
            {data && (
              <div>
                {!data?.admins.length && (
                  <div className="mb-4">
                    <Button
                      onClick={async () => {
                        const result = await claimextraAdminAction();
                        handleActionResult(result, "Admin claimed!");
                        mutate();
                      }}
                    >
                      Claim Admin
                    </Button>
                  </div>
                )}

                {extraTier && (
                  <ExtraSeatsAlert
                    extraTier={extraTier}
                    emailAccountsAccess={
                      dataextra?.extra?.emailAccountsAccess || 0
                    }
                    seatsUsed={data.users.length}
                  />
                )}

                <div className="mt-4">
                  <MultiAccountForm
                    emailAddresses={data.users as { email: string }[]}
                    isLifetime={dataextra?.extra?.tier === extraTier.LIFETIME}
                    emailAccountsAccess={
                      dataextra?.extra?.emailAccountsAccess || 0
                    }
                    pendingInvites={dataextra?.extra?.pendingInvites || []}
                  />
                </div>
              </div>
            )}
          </LoadingContent>
        ) : (
          <div className="sm:col-span-2">
            <AlertWithButton
              title="Upgrade"
              description="Upgrade to extra to share extra with other email addresses."
              icon={<CrownIcon className="h-4 w-4" />}
              button={<Button onClick={openModal}>Upgrade</Button>}
            />
            <ExtraModal />
          </div>
        )}
      </LoadingContent>
    </FormSection>
  );
}

function MultiAccountForm({
  emailAddresses,
  isLifetime,
  emailAccountsAccess,
  pendingInvites,
}: {
  emailAddresses: { email: string }[];
  isLifetime: boolean;
  emailAccountsAccess: number;
  pendingInvites: string[];
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useForm<SaveMultiAccountextraBody>({
    resolver: zodResolver(saveMultiAccountextraBody),
    defaultValues: {
      emailAddresses: emailAddresses?.length
        ? [...emailAddresses, ...pendingInvites.map((email) => ({ email }))]
        : [{ email: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "emailAddresses",
    control,
  });
  const posthog = usePostHog();

  const extraSeats = fields.length - emailAccountsAccess - 1;
  const needsToPurchaseMoreSeats = isLifetime && extraSeats > 0;

  const onSubmit: SubmitHandler<SaveMultiAccountextraBody> = useCallback(
    async (data) => {
      if (!data.emailAddresses) return;
      if (needsToPurchaseMoreSeats) return;

      const emails = data.emailAddresses.map((e) => e.email);
      const result = await updateMultiAccountextraAction(emails);

      handleActionResult(result, "Users updated!");
    },
    [needsToPurchaseMoreSeats],
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        {fields.map((f, i) => {
          return (
            <div key={f.id}>
              <Input
                type="text"
                name={`rules.${i}.instructions`}
                registerProps={register(`emailAddresses.${i}.email`)}
                error={errors.emailAddresses?.[i]?.email}
                onClickAdd={() => {
                  append({ email: "" });
                  posthog.capture("Clicked Add User");
                }}
                onClickRemove={
                  fields.length > 1
                    ? () => {
                        remove(i);
                        posthog.capture("Clicked Remove User");
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>

      {needsToPurchaseMoreSeats ? (
        <Button type="button" loading={isSubmitting} asChild>
          <Link
            href={`${env.NEXT_PUBLIC_LIFETIME_EXTRA_SEATS_PAYMENT_LINK}?quantity=${extraSeats}`}
            target="_blank"
          >
            Purchase {extraSeats} Extra Seat{extraSeats > 1 ? "s" : ""}
          </Link>
        </Button>
      ) : (
        <Button type="submit" loading={isSubmitting}>
          Save
        </Button>
      )}
    </form>
  );
}

function ExtraSeatsAlert({
  emailAccountsAccess,
  extraTier,
  seatsUsed,
}: {
  emailAccountsAccess: number;
  extraTier: extraTier;
  seatsUsed: number;
}) {
  if (emailAccountsAccess > seatsUsed) {
    return (
      <AlertBasic
        title="Seats"
        description={`You have access to ${emailAccountsAccess} seats.`}
        icon={<CrownIcon className="h-4 w-4" />}
      />
    );
  }

  return (
    <AlertBasic
      title="Extra email price"
      description={`You are on the ${capitalCase(
        extraTier,
      )} plan. You will be billed $${
        ExtraFeaturesAdditonalEmail[extraTier]
      } for each extra email you add to your account.`}
      icon={<CrownIcon className="h-4 w-4" />}
    />
  );
}
