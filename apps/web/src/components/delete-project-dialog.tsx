import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteProjectDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  projectName?: string;
};

export function DeleteProjectDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  projectName,
}: DeleteProjectDialogProps) {
  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenChange(false);
  };

  const handleAutoFocus = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={handleAutoFocus}>
        <DialogHeader>
          <DialogTitle>
            {projectName ? (
              <>
                Delete &apos;
                <span className="inline-block max-w-[300px] truncate align-bottom">
                  {projectName}
                </span>
                &apos;?
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
            variant="text"
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            type="button"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
