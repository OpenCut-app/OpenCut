"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useSceneStore } from "@/stores/scene-store";
import { Check, ListCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ScenesView({ children }: { children: React.ReactNode }) {
  const { scenes, currentScene, switchToScene, deleteScene } = useSceneStore();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());

  const handleSceneSwitch = async (sceneId: string) => {
    if (isSelectMode) {
      toggleSceneSelection(sceneId);
      return;
    }

    try {
      await switchToScene({ sceneId });
    } catch (error) {
      console.error("Failed to switch scene:", error);
    }
  };

  const toggleSceneSelection = (sceneId: string) => {
    setSelectedScenes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId);
      } else {
        newSet.add(sceneId);
      }
      return newSet;
    });
  };

  const handleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedScenes(new Set());
  };

  const handleDeleteSelected = async () => {
    for (const sceneId of selectedScenes) {
      const scene = scenes.find((s) => s.id === sceneId);
      if (scene && !scene.isMain) {
        try {
          await deleteScene({ sceneId });
        } catch (error) {
          console.error("Failed to delete scene:", error);
        }
      }
    }
    setSelectedScenes(new Set());
    setIsSelectMode(false);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {isSelectMode ? `Select scenes (${selectedScenes.size})` : "Scenes"}
          </SheetTitle>
          <SheetDescription>
            {isSelectMode
              ? "Select scenes to delete"
              : "Switch between scenes in your project"}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Button
              className="rounded-md"
              variant={isSelectMode ? "default" : "outline"}
              size="sm"
              onClick={handleSelectMode}
            >
              <ListCheck />
              {isSelectMode ? "Cancel" : "Select"}
            </Button>
            {isSelectMode && (
              <DeleteDialog
                count={selectedScenes.size}
                onDelete={handleDeleteSelected}
                disabled={Array.from(selectedScenes).some(
                  (id) => scenes.find((s) => s.id === id)?.isMain
                )}
              >
                <Button className="rounded-md" variant="destructive" size="sm">
                  <Trash2 />
                  Delete ({selectedScenes.size})
                </Button>
              </DeleteDialog>
            )}
          </div>
          {scenes.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No scenes available
            </div>
          ) : (
            <div className="space-y-2">
              {scenes.map((scene) => (
                <Button
                  key={scene.id}
                  variant="outline"
                  className={cn(
                    "w-full justify-between font-normal",
                    currentScene?.id === scene.id &&
                      !isSelectMode &&
                      "border-primary !text-primary",
                    isSelectMode &&
                      selectedScenes.has(scene.id) &&
                      "bg-accent border-foreground/30"
                  )}
                  onClick={() => handleSceneSwitch(scene.id)}
                >
                  <span>{scene.name}</span>
                  <div className="flex items-center gap-2">
                    {((isSelectMode && selectedScenes.has(scene.id)) ||
                      (!isSelectMode && currentScene?.id === scene.id)) && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DeleteDialog({
  count,
  onDelete,
  disabled,
  children,
}: {
  count: number;
  onDelete: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    onDelete();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Scenes</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {count} scene
            {count === 1 ? "" : "s"}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={disabled}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
