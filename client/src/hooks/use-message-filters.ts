import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export type MessageFilters = {
  query: string;
  agents: string[];
  channels: string[];
  status: "closed" | "pending" | "all";
  dateRange?: { from: string; to: string } | null;
  unreadOnly: boolean;
};

const parseCsv = (v: string | null): string[] => (v ? v.split(",").filter(Boolean) : []);
const toCsv = (arr: string[]) => (arr && arr.length ? arr.join(",") : "");

const isValidStatus = (v: string | null): MessageFilters["status"] => {
  switch (v) {
    case "closed":
    case "pending":
    case "all":
      return v;
    default:
      return "all";
  }
};

const normalizeDateRange = (from: string | null, to: string | null): MessageFilters["dateRange"] => {
  if (!from && !to) return null;
  return { from: from || "", to: to || "" };
};

export function useMessageFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initial: MessageFilters = useMemo(
    () => {
      // Check if agentId is in URL and prioritize it
      const agentIdFromUrl = searchParams.get("agentId");
      const existingAgents = parseCsv(searchParams.get("agents"));
      
      return {
        query: searchParams.get("q") || "",
        agents: agentIdFromUrl ? [agentIdFromUrl] : existingAgents,
        channels: parseCsv(searchParams.get("channels")),
        status: isValidStatus(searchParams.get("status")),
        dateRange: normalizeDateRange(searchParams.get("from"), searchParams.get("to")),
        unreadOnly: searchParams.get("unread") === "1",
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [filters, setFiltersState] = useState<MessageFilters>(initial);

  // Keep URL in sync whenever filters change
  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (filters.query) next.set("q", filters.query); else next.delete("q");
    if (filters.agents.length) next.set("agents", toCsv(filters.agents)); else next.delete("agents");
    if (filters.channels.length) next.set("channels", toCsv(filters.channels)); else next.delete("channels");
    if (filters.status && filters.status !== "all") next.set("status", filters.status); else next.delete("status");
    if (filters.dateRange?.from) next.set("from", filters.dateRange.from); else next.delete("from");
    if (filters.dateRange?.to) next.set("to", filters.dateRange.to); else next.delete("to");
    if (filters.unreadOnly) next.set("unread", "1"); else next.delete("unread");

    // Reset page when filters change
    next.delete("page");

    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const setFilters = useCallback((updater: Partial<MessageFilters> | ((current: MessageFilters) => MessageFilters)) => {
    setFiltersState((prev) => {
      const next = typeof updater === "function" ? (updater as any)(prev) : { ...prev, ...updater };
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    // Check if we have agentId in URL to preserve it
    const agentIdFromUrl = searchParams.get("agentId");
    
    setFiltersState({
      query: "",
      agents: agentIdFromUrl ? [agentIdFromUrl] : [], // Keep agent filter if from URL
      channels: [],
      status: "all",
      dateRange: null,
      unreadOnly: false,
    });
  }, [searchParams]);

  return { filters, setFilters, resetFilters } as const;
}