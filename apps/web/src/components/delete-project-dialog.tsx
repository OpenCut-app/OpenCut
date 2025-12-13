import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function DeleteProjectDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  projectName,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  projectName?: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {projectName ? (
              <>
                {"Delete '"}
                <span className="inline-block max-w-[300px] truncate align-bottom">
                  {projectName}
                </span>
                {"'?"}
              </>
            ) : (
              "Delete Project?"
            )}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this project? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
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
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
