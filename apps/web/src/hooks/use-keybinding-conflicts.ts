"use client";

import { useMemo } from "react";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { ActionWithOptionalArgs } from "@/constants/actions";

export interface KeybindingConflictInfo {
  key: string;
  actions: ActionWithOptionalArgs[];
  isConflict: boolean;
}

export const useKeybindingConflicts = () => {
  const { keybindings } = useKeybindingsStore();

  const conflicts = useMemo(() => {
    const keyToActions: Record<string, ActionWithOptionalArgs[]> = {};
    const conflictList: KeybindingConflictInfo[] = [];

    // Group actions by key
    Object.entries(keybindings).forEach(([key, action]) => {
      if (!keyToActions[key]) {
        keyToActions[key] = [];
      }
      keyToActions[key].push(action);
    });

    // Find conflicts
    Object.entries(keyToActions).forEach(([key, actions]) => {
      const uniqueActions = [...new Set(actions)];
      conflictList.push({
        key,
        actions: uniqueActions,
        isConflict: uniqueActions.length > 1,
      });
    });

    return conflictList.filter((item) => item.isConflict);
  }, [keybindings]);

  const hasConflicts = conflicts.length > 0;

  const getConflictsForKey = (key: string): KeybindingConflictInfo | null => {
    return conflicts.find((conflict) => conflict.key === key) || null;
  };

  const getConflictsForAction = (
    action: ActionWithOptionalArgs
  ): KeybindingConflictInfo[] => {
    return conflicts.filter((conflict) => conflict.actions.includes(action));
  };

  return {
    conflicts,
    hasConflicts,
    getConflictsForKey,
    getConflictsForAction,
  };
};
