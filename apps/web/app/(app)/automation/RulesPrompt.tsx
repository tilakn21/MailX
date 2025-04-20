"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { SparklesIcon, UserPenIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import useSWR from "swr";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  saveRulesPromptAction,
  generateRulesPromptAction,
} from "@/utils/actions/ai-rule";
import { isActionError } from "@/utils/error";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/Input";
import {
  saveRulesPromptBody,
  type SaveRulesPromptBody,
} from "@/utils/actions/rule.validation";
import { SectionHeader } from "@/components/Typography";
import type { RulesPromptResponse } from "@/app/api/user/rules/prompt/route";
import { LoadingContent } from "@/components/LoadingContent";
import { Tooltip } from "@/components/Tooltip";
import { handleActionCall } from "@/utils/server-action";
import { PremiumAlertWithData } from "@/components/PremiumAlert";
import { AutomationOnboarding } from "@/app/(app)/automation/AutomationOnboarding";
import { examplePrompts, personas } from "@/app/(app)/automation/examples";
import { PersonaDialog } from "@/app/(app)/automation/PersonaDialog";
import { useModal } from "@/hooks/useModal";
import { ProcessingPromptFileDialog } from "@/app/(app)/automation/ProcessingPromptFileDialog";
import { AlertBasic } from "@/components/Alert";

export function RulesPrompt() {
  const { data, isLoading, error, mutate } = useSWR<
    RulesPromptResponse,
    { error: string }
  >("/api/user/rules/prompt");
  const { isModalOpen, setIsModalOpen } = useModal();
  const onOpenPersonaDialog = useCallback(
    () => setIsModalOpen(true),
    [setIsModalOpen],
  );

  const [persona, setPersona] = useState<string | null>(null);

  const personaPrompt = persona
    ? personas[persona as keyof typeof personas]?.prompt
    : undefined;

  return (
    <>
      <LoadingContent loading={isLoading} error={error}>
        <RulesPromptForm
          rulesPrompt={data?.rulesPrompt || undefined}
          personaPrompt={personaPrompt}
          mutate={mutate}
          onOpenPersonaDialog={onOpenPersonaDialog}
        />
        <AutomationOnboarding
          onComplete={() => {
            if (!data?.rulesPrompt) onOpenPersonaDialog();
          }}
        />
      </LoadingContent>
      <PersonaDialog
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        onSelect={setPersona}
      />
    </>
  );
}

function RulesPromptForm({
  rulesPrompt,
  personaPrompt,
  mutate,
  onOpenPersonaDialog,
}: {
  rulesPrompt?: string;
  personaPrompt?: string;
  mutate: () => void;
  onOpenPersonaDialog: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [result, setResult] = useState<{
    createdRules: number;
    editedRules: number;
    removedRules: number;
  }>();
  const [showClearWarning, setShowClearWarning] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showRules, setShowRules] = useState(false);

  const [
    viewedProcessingPromptFileDialog,
    setViewedProcessingPromptFileDialog,
  ] = useLocalStorage("viewedProcessingPromptFileDialog", false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useForm<SaveRulesPromptBody>({
    resolver: zodResolver(saveRulesPromptBody),
    defaultValues: { rulesPrompt },
  });

  const currentPrompt = watch("rulesPrompt");

  useEffect(() => {
    setShowClearWarning(!!rulesPrompt && currentPrompt === "");
  }, [currentPrompt, rulesPrompt]);

  useEffect(() => {
    if (!personaPrompt) return;

    const currentPrompt = getValues("rulesPrompt") || "";
    const updatedPrompt = `${currentPrompt}\n\n${personaPrompt}`.trim();
    setValue("rulesPrompt", updatedPrompt);
  }, [personaPrompt, getValues, setValue]);

  useEffect(() => {
    if (showRules) {
      setChatMessages([]);
    }
  }, [showRules]);

  const router = useRouter();

  const onSubmit = useCallback(
    async (data: SaveRulesPromptBody) => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      const saveRulesPromise = async (data: SaveRulesPromptBody) => {
        const result = await handleActionCall("saveRulesPromptAction", () =>
          saveRulesPromptAction(data),
        );

        if (isActionError(result)) {
          setIsSubmitting(false);
          throw new Error(result.error);
        }

        mutate();
        setIsSubmitting(false);

        return result;
      };

      setResult(undefined);

      toast.promise(() => saveRulesPromise(data), {
        loading: "Saving rules... This may take a while to process...",
        success: (result) => {
          setResult(result);
          const { createdRules, editedRules, removedRules } = result || {};

          const message = [
            createdRules ? `${createdRules} rules created.` : "",
            editedRules ? `${editedRules} rules edited.` : "",
            removedRules ? `${removedRules} rules removed.` : "",
          ]
            .filter(Boolean)
            .join(" ");

          return `Rules saved successfully! ${message}`;
        },
        error: (err) => {
          return `Error saving rules: ${err.message}`;
        },
      });
    },
    [mutate, isSubmitting],
  );

  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim()) return;

    if (showRules) {
      // In rules mode, add the input directly to rules
      const currentRulesPrompt = getValues("rulesPrompt") || "";
      const newRulesPrompt = currentRulesPrompt
        ? `${currentRulesPrompt}\n${inputValue.trim()}`
        : inputValue.trim();

      setValue("rulesPrompt", newRulesPrompt);

      // Save the rules immediately
      onSubmit({ rulesPrompt: newRulesPrompt });
    } else {
      // In chat mode, add user message to chat
      const newMessage = `* ${inputValue.trim()}`;
      const updatedMessages = [...chatMessages, newMessage];
      setChatMessages(updatedMessages);
    }

    // Clear input
    setInputValue("");
  }, [inputValue, chatMessages, setValue, showRules, getValues, onSubmit]);

  return (
    <div>
      <PremiumAlertWithData className="my-2" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <ProcessingPromptFileDialog
            open={isDialogOpen}
            result={result}
            onOpenChange={setIsDialogOpen}
            setViewedProcessingPromptFileDialog={
              setViewedProcessingPromptFileDialog
            }
          />

          <CardHeader className="px-0 py-4">
            <CardTitle>Chat with your AI assistant</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {showClearWarning && (
              <AlertBasic
                className="mb-2"
                variant="blue"
                title="Warning: Deleting text will remove or disable rules"
                description="Add new rules at the end to keep your existing rules."
              />
            )}

            <div className="space-y-4">
              <div className="flex max-h-[70vh] min-h-[400px] flex-col rounded-xl border bg-gradient-to-b from-gray-50 to-white p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:from-gray-900 dark:to-gray-950">
                <ScrollArea
                  className="mb-4 flex-grow overflow-y-auto"
                  scrollHideDelay={100}
                >
                  <div className="space-y-3 p-2">
                    {showRules ? (
                      // Show rules from rulesPrompt
                      rulesPrompt ? (
                        rulesPrompt
                          .split("\n")
                          .filter((line) => line.trim())
                          .map((line, index) => (
                            <div
                              key={index}
                              className="rounded-xl bg-gradient-to-br from-gray-100 to-gray-200/90 p-3 shadow-sm backdrop-blur-sm transition-all duration-200 dark:from-gray-800 dark:to-gray-900"
                            >
                              {line}
                            </div>
                          ))
                      ) : (
                        <div className="rounded-xl border border-gray-200/50 bg-gray-100/50 p-3 italic text-gray-500 backdrop-blur-sm dark:border-gray-700/30 dark:bg-gray-800/50">
                          No rules defined yet. Start chatting with your
                          assistant to create rules.
                        </div>
                      )
                    ) : (
                      // Show chat messages
                      chatMessages.map((message, index) => (
                        <div
                          key={index}
                          className={`max-w-[80%] rounded-xl p-3 shadow-sm ${
                            message.startsWith("*")
                              ? "ml-auto bg-gradient-to-br from-blue-100 to-blue-200/90 backdrop-blur-sm dark:from-blue-800 dark:to-blue-900"
                              : "bg-gradient-to-br from-gray-100 to-gray-200/90 backdrop-blur-sm dark:from-gray-800 dark:to-gray-900"
                          }`}
                        >
                          {message.startsWith("*")
                            ? message.substring(1).trim()
                            : message}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                <div className="relative flex items-end gap-2 rounded-xl border border-blue-100/80 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-3 shadow-sm transition-all duration-200 hover:shadow-md dark:border-blue-800/30 dark:from-blue-950/30 dark:to-indigo-950/30">
                  <div className="group relative flex-grow">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/10 to-indigo-500/10 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100 dark:from-blue-400/5 dark:to-indigo-500/5"></div>
                    <Input
                      className="flex-grow rounded-lg border-blue-200/70 bg-white/80 shadow-inner backdrop-blur-sm transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500/50 dark:border-blue-700/30 dark:bg-gray-900/80 dark:focus:ring-blue-400/30"
                      name="inputValue"
                      type="text"
                      placeholder="Type your instructions for the AI assistant here..."
                      registerProps={{
                        value: inputValue,
                        onChange: (
                          e: React.ChangeEvent<
                            HTMLInputElement | HTMLTextAreaElement
                          >,
                        ) => setInputValue(e.target.value),
                        onKeyDown: (
                          e: React.KeyboardEvent<
                            HTMLInputElement | HTMLTextAreaElement
                          >,
                        ) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        },
                      }}
                      autosizeTextarea
                      rows={1}
                      maxRows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="primaryBlue"
                      size="default"
                      disabled={isSubmitting || !inputValue.trim()}
                      onClick={handleSendMessage}
                      className="group relative overflow-hidden transition-all duration-200 hover:translate-y-[-1px] hover:shadow-lg active:translate-y-[1px]"
                    >
                      <span className="absolute inset-0 h-full w-full bg-gradient-to-tr from-blue-500/0 via-blue-500/0 to-blue-300/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:to-blue-200/10"></span>
                      <span className="relative z-10 flex items-center">
                        {showRules ? "Add Rule" : "Send"}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant={showRules ? "default" : "outline"}
                      size="icon"
                      onClick={() => {
                        // Toggle the state
                        setShowRules(!showRules);
                        // If switching to rules mode, clear input
                        if (!showRules) {
                          setInputValue("");
                        }
                      }}
                      title={showRules ? "Show Chat" : "Show Rules"}
                      className="group relative overflow-hidden transition-all duration-200 hover:translate-y-[-1px] hover:shadow-lg active:translate-y-[1px]"
                    >
                      <span className="absolute inset-0 h-full w-full bg-gradient-to-tr from-blue-500/0 via-blue-500/0 to-blue-300/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:to-blue-200/10"></span>
                      <span className="relative z-10 flex items-center">
                        {showRules ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-message-square"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-list"
                          >
                            <line x1="8" x2="21" y1="6" y2="6" />
                            <line x1="8" x2="21" y1="12" y2="12" />
                            <line x1="8" x2="21" y1="18" y2="18" />
                            <line x1="3" x2="3.01" y1="6" y2="6" />
                            <line x1="3" x2="3.01" y1="12" y2="12" />
                            <line x1="3" x2="3.01" y1="18" y2="18" />
                          </svg>
                        )}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Save button removed as requested */}
            </div>
          </CardContent>
        </div>

        <div className="sm:col-span-1">
          <CardHeader className="px-0 py-4">
            <CardTitle className="flex items-center">
              <span className="relative mr-2">
                <span className="absolute -inset-1 rounded-full bg-blue-100/50 blur-sm dark:bg-blue-900/20"></span>
                <SparklesIcon className="relative h-5 w-5 text-blue-500 dark:text-blue-400" />
              </span>
              Existing Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="min-h-[400px] rounded-xl border bg-gradient-to-b from-gray-50 to-white p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:from-gray-900 dark:to-gray-950">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  <SectionHeader className="font-medium text-blue-600 dark:text-blue-400">
                    Your Current Rules
                  </SectionHeader>
                  <div className="space-y-3">
                    {rulesPrompt ? (
                      rulesPrompt
                        .split("\n")
                        .filter((line) => line.trim())
                        .map((line, index) => (
                          <div
                            key={index}
                            className="rounded-xl bg-gradient-to-br from-gray-100 to-gray-200/90 p-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md dark:from-gray-800 dark:to-gray-900"
                          >
                            {line}
                          </div>
                        ))
                    ) : (
                      <div className="rounded-xl border border-gray-200/50 bg-gray-100/50 p-3 italic text-gray-500 backdrop-blur-sm dark:border-gray-700/30 dark:bg-gray-800/50">
                        No rules defined yet. Start chatting with your assistant
                        to create rules.
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </div>
      </div>
    </div>
  );
}
