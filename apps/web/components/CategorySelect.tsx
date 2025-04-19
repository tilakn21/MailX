"use client";

import type { Category } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changeSenderCategoryAction } from "@/utils/actions/categorize";
import { toastError, toastSuccess } from "@/components/Toast";
import { isActionError } from "@/utils/error";
import { useAiCategorizationQueueItem } from "@/store/ai-categorize-sender-queue";
import { LoadingMiniSpinner } from "@/components/Loading";

export function CategorySelect({
  sender,
  senderCategory,
  categories,
  onSuccess,
}: {
  sender: string;
  senderCategory: Pick<Category, "id"> | null;
  categories: Pick<Category, "id" | "name">[];
  onSuccess?: (categoryId: string) => void;
}) {
  const item = useAiCategorizationQueueItem(sender);

  if (item?.status && item?.status !== "completed") {
    return (
      <span className="flex items-center text-muted-foreground">
        <LoadingMiniSpinner />
        <span className="ml-2">Categorizing...</span>
      </span>
    );
  }

  return (
    <Select
      defaultValue={item?.categoryId || senderCategory?.id || ""}
      onValueChange={async (value) => {
        const result = await changeSenderCategoryAction({
          sender,
          categoryId: value,
        });

        if (isActionError(result)) {
          toastError({ description: result.error });
        } else {
          toastSuccess({ description: "Category changed" });
          onSuccess?.(value);
        }
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id.toString()}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
