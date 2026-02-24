import { useReducer, useRef } from "react";
import { evaluateMathExpression } from "@/utils/math";

function looksLikeExpression({ input }: { input: string }): boolean {
	const trimmed = input.trim();
	if (!trimmed) return false;
	if (/[+*/]/.test(input)) return true;
	const minusIndex = trimmed.indexOf("-");
	return minusIndex > 0;
}

export function usePropertyDraft<T>({
	displayValue: sourceDisplay,
	parse,
	onPreview,
	onCommit,
	supportsExpressions = true,
}: {
	displayValue: string;
	parse: (input: string) => T | null;
	onPreview: (value: T) => void;
	onCommit: () => void;
	supportsExpressions?: boolean;
}) {
	const [, forceRender] = useReducer(
		(renderVersion: number) => renderVersion + 1,
		0,
	);
	const isEditing = useRef(false);
	const draft = useRef("");

	return {
		displayValue: isEditing.current ? draft.current : sourceDisplay,
		scrubTo: (value: number) => {
			const parsed = parse(String(value));
			if (parsed !== null) onPreview(parsed);
		},
		commitScrub: onCommit,
		onFocus: () => {
			isEditing.current = true;
			draft.current = sourceDisplay;
			forceRender();
		},
		onChange: (
			event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		) => {
			draft.current = event.target.value;
			forceRender();

			const parsed = parse(event.target.value);
			if (parsed !== null) {
				onPreview(parsed);
			}
		},
		onBlur: () => {
			if (
				supportsExpressions &&
				looksLikeExpression({ input: draft.current })
			) {
				const evaluated = evaluateMathExpression({ input: draft.current });
				if (evaluated !== null) {
					const parsed = parse(String(evaluated));
					if (parsed !== null) onPreview(parsed);
				}
			}
			onCommit();
			isEditing.current = false;
			draft.current = "";
			forceRender();
		},
	};
}
