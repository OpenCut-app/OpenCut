import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const REQUIRED_CONFIRMATION_TEXT = "DELETE";

export function DeleteProjectDialog({
	isOpen,
	onOpenChange,
	onConfirm,
	projectNames,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	projectNames: string[];
}) {
	const count = projectNames.length;
	const isSingle = count === 1;
	const singleName = isSingle ? projectNames[0] : null;
	
	const [confirmationInput, setConfirmationInput] = useState<string>("");

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					event.stopPropagation();
				}}
			>
				<DialogHeader>
					<DialogTitle>
						{singleName ? (
							<>
								{"Delete '"}
								<span className="inline-block max-w-[300px] truncate align-bottom">
									{singleName}
								</span>
								{"'?"}
							</>
						) : (
							`Delete ${count} projects?`
						)}
					</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<Alert variant="destructive">
						<AlertTitle>Warning</AlertTitle>
						<AlertDescription>
							This will permanently delete{" "}
							{singleName ? `"${singleName}"` : `${count} projects`} and all
							associated files.
						</AlertDescription>
					</Alert>
					<div className="flex flex-col gap-3">
						<Label className="text-xs font-semibold text-slate-500">
							{`Type "${REQUIRED_CONFIRMATION_TEXT}" to confirm`}
						</Label>
						<Input
							onChange={(e) => {setConfirmationInput(e.target.value)}}
							value={confirmationInput}
							type="text"
							placeholder={REQUIRED_CONFIRMATION_TEXT}
							size="lg"
							variant="destructive"
						/>
					</div>
				</DialogBody>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={onConfirm} disabled={confirmationInput != REQUIRED_CONFIRMATION_TEXT}>
						Delete project
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
