"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteEntryApi, type LogEntryPayload, logEntryApi } from "@/lib/api-entries";
import { getStatusVerb } from "@/lib/media-formatters";

export interface LogEntryVariables<TMeta = unknown> extends LogEntryPayload {
  meta?: TMeta;
}

export interface RemoveEntryVariables<TMeta = unknown> {
  id: string;
  title?: string;
  meta?: TMeta;
}

interface UseEntryMutationsOptions<TLogMeta = unknown, TRemoveMeta = unknown> {
  onLogMutate?: (variables: LogEntryVariables<TLogMeta>) => void;
  onLogSuccess?: (data: unknown, variables: LogEntryVariables<TLogMeta>) => void;
  onRemoveMutate?: (variables: RemoveEntryVariables<TRemoveMeta>) => void;
  onRemoveSuccess?: (data: unknown, variables: RemoveEntryVariables<TRemoveMeta>) => void;
}

/**
 * Shared React Query mutations for logging and removing library entries
 * with consistent 401 handling, router refresh, and toast feedback.
 */
export function useEntryMutations<TLogMeta = unknown, TRemoveMeta = unknown>(
  options: UseEntryMutationsOptions<TLogMeta, TRemoveMeta> = {},
) {
  const router = useRouter();

  const logMutation = useMutation({
    mutationFn: async (variables: LogEntryVariables<TLogMeta>) => {
      return logEntryApi({
        media: variables.media,
        status: variables.status,
        rating: variables.rating,
        reviewNote: variables.reviewNote,
      });
    },
    onMutate: (variables) => {
      options.onLogMutate?.(variables);
    },
    onSuccess: (data, variables) => {
      router.refresh();
      if (options.onLogSuccess) {
        options.onLogSuccess(data, variables);
      } else {
        toast.success(getStatusVerb(variables.status), {
          description: variables.media.title,
        });
      }
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to update status");
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (variables: RemoveEntryVariables<TRemoveMeta>) => {
      return deleteEntryApi(variables.id);
    },
    onMutate: (variables) => {
      options.onRemoveMutate?.(variables);
    },
    onSuccess: (data, variables) => {
      router.refresh();
      if (options.onRemoveSuccess) {
        options.onRemoveSuccess(data, variables);
      } else {
        toast.success("Removed from library", {
          description: variables.title,
        });
      }
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to remove from library");
      }
    },
  });

  return {
    logEntry: logMutation.mutate,
    isLogging: logMutation.isPending,
    removeEntry: removeMutation.mutate,
    isRemoving: removeMutation.isPending,
  };
}
