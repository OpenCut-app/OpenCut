import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function RenameProjectDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  projectName,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
  projectName: string;
}) {
  const [name, setName] = useState(projectName);

  // Reset the name when dialog opens - this is better UX than syncing with every prop change
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(projectName);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Project</DialogTitle>
          <DialogDescription>
            Enter a new name for your project.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onConfirm(name);
            }
          }}
          placeholder="Enter a new name"
          className="mt-0 bg-background border-2 border-border"
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={() => onConfirm(name)}>Rename</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
