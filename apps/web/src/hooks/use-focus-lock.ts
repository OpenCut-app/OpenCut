import { useEffect, useRef } from "react";

type FocusLockCursor = "text" | "default" | "pointer" | "crosshair";

const DATA_ATTR = "data-focus-locked";

function buildFocusLockCSS({
	cursor,
	allowSelector,
}: {
	cursor: FocusLockCursor;
	allowSelector?: string;
}) {
	const rules = [
		`*, *::before, *::after { pointer-events: none !important; cursor: ${cursor} !important; }`,
		`[${DATA_ATTR}], [${DATA_ATTR}] * { pointer-events: auto !important; cursor: auto !important; }`,
	];

	if (allowSelector) {
		rules.push(
			`${allowSelector} { pointer-events: auto !important; cursor: auto !important; }`,
		);
	}

	return rules.join("\n");
}

export function useFocusLock<T extends HTMLElement = HTMLElement>({
	isActive,
	onDismiss,
	cursor = "default",
	allowSelector,
}: {
	isActive: boolean;
	onDismiss: () => void;
	cursor?: FocusLockCursor;
	allowSelector?: string;
}) {
	const containerRef = useRef<T>(null);
	const onDismissRef = useRef(onDismiss);
	onDismissRef.current = onDismiss;

	useEffect(() => {
		if (!isActive) return;
		const container = containerRef.current;
		if (!container) return;

		container.setAttribute(DATA_ATTR, "");

		const focusLockStyle = document.createElement("style");
		focusLockStyle.textContent = buildFocusLockCSS({ cursor, allowSelector });
		document.head.appendChild(focusLockStyle);

		const handleOutsidePointerDown = (event: PointerEvent) => {
			if (event.button !== 0) return;
			if (container.contains(event.target as Node)) return;

			const target = event.target as Element | null;
			const isAllowedTarget = allowSelector && target?.closest(allowSelector);
			if (isAllowedTarget) return;

			onDismissRef.current();
		};

		document.addEventListener("pointerdown", handleOutsidePointerDown, true);

		return () => {
			document.removeEventListener(
				"pointerdown",
				handleOutsidePointerDown,
				true,
			);
			container.removeAttribute(DATA_ATTR);
			focusLockStyle.remove();
		};
	}, [isActive, cursor, allowSelector]);

	return { containerRef };
}
