import { useCallback } from "react";
import { useEditor } from "@/editor/use-editor";
import type { ElementRef } from "@/timeline/types";

export function useElementSelection() {
	const editor = useEditor();
	const selectedElements = useEditor((e) => e.selection.getSelectedElements());

	const isElementSelected = useCallback(
		({ trackId, elementId }: ElementRef) =>
			selectedElements.some(
				(element) =>
					element.trackId === trackId && element.elementId === elementId,
			),
		[selectedElements],
	);

	const selectElement = useCallback(
		({ trackId, elementId }: ElementRef) => {
			editor.selection.setSelectedElements({
				elements: [{ trackId, elementId }],
			});
		},
		[editor],
	);

	const addElementToSelection = useCallback(
		({ trackId, elementId }: ElementRef) => {
			const alreadySelected = selectedElements.some(
				(element) =>
					element.trackId === trackId && element.elementId === elementId,
			);
			if (alreadySelected) return;

			editor.selection.setSelectedElements({
				elements: [...selectedElements, { trackId, elementId }],
			});
		},
		[selectedElements, editor],
	);

	const removeElementFromSelection = useCallback(
		({ trackId, elementId }: ElementRef) => {
			editor.selection.setSelectedElements({
				elements: selectedElements.filter(
					(element) =>
						!(element.trackId === trackId && element.elementId === elementId),
				),
			});
		},
		[selectedElements, editor],
	);

	const toggleElementSelection = useCallback(
		({ trackId, elementId }: ElementRef) => {
			const alreadySelected = selectedElements.some(
				(element) =>
					element.trackId === trackId && element.elementId === elementId,
			);

			if (alreadySelected) {
				removeElementFromSelection({ trackId, elementId });
			} else {
				addElementToSelection({ trackId, elementId });
			}
		},
		[selectedElements, addElementToSelection, removeElementFromSelection],
	);

	const clearElementSelection = useCallback(() => {
		editor.selection.clearSelection();
	}, [editor]);

	const setElementSelection = useCallback(
		({ elements }: { elements: ElementRef[] }) => {
			editor.selection.setSelectedElements({ elements });
		},
		[editor],
	);


	/**
	 * Merges elements into the current selection, deduplicating by identity.
	 * Used for additive box-select where the pre-drag selection is preserved.
	 */
	const mergeElementsIntoSelection = useCallback(
		({ elements }: { elements: ElementRef[] }) => {
			const merged = [
				...selectedElements.filter(
					(selectedElement) =>
						!elements.some(
							(element) =>
								element.trackId === selectedElement.trackId &&
								element.elementId === selectedElement.elementId,
						),
				),
				...elements,
			];
			editor.selection.setSelectedElements({ elements: merged });
		},
		[selectedElements, editor],
	);

	/**
	 * Selects every element between the anchor and target on the same timeline row.
	 * Falls back to selecting only the target when no same-row anchor exists.
	 */
	const selectElementRange = useCallback(
		({
			anchor,
			target,
		}: {
			anchor?: ElementRef | null;
			target: ElementRef;
		}) => {
			const tracks = editor.scenes.getActiveScene().tracks;
			const track = [...tracks.overlay, tracks.main, ...tracks.audio].find(
				(candidate) => candidate.id === target.trackId,
			);
			const rangeAnchor =
				anchor?.trackId === target.trackId
					? anchor
					: selectedElements
							.slice()
							.reverse()
							.find((element) => element.trackId === target.trackId);

			if (!track || !rangeAnchor) {
				const elements = [target];
				editor.selection.setSelectedElements({ elements });
				return elements;
			}

			const orderedElements = track.elements
				.map((element, index) => ({ element, index }))
				.sort((a, b) => {
					if (a.element.startTime !== b.element.startTime) {
						return a.element.startTime - b.element.startTime;
					}
					return a.index - b.index;
				});
			const anchorIndex = orderedElements.findIndex(
				({ element }) => element.id === rangeAnchor.elementId,
			);
			const targetIndex = orderedElements.findIndex(
				({ element }) => element.id === target.elementId,
			);

			if (anchorIndex === -1 || targetIndex === -1) {
				const elements = [target];
				editor.selection.setSelectedElements({ elements });
				return elements;
			}

			const start = Math.min(anchorIndex, targetIndex);
			const end = Math.max(anchorIndex, targetIndex);
			const elements = orderedElements
				.slice(start, end + 1)
				.map(({ element }) => ({
					trackId: target.trackId,
					elementId: element.id,
				}));

			editor.selection.setSelectedElements({ elements });
			return elements;
		},
		[selectedElements, editor],
	);

	/**
	 * Handles click interaction on an element.
	 * - Regular click: select only this element
	 * - Multi-key click (Ctrl/Cmd): toggle this element in selection
	 */
	const handleElementClick = useCallback(
		({
			trackId,
			elementId,
			isMultiKey,
		}: ElementRef & { isMultiKey: boolean }) => {
			if (isMultiKey) {
				toggleElementSelection({ trackId, elementId });
			} else {
				selectElement({ trackId, elementId });
			}
		},
		[toggleElementSelection, selectElement],
	);

	return {
		selectedElements,
		isElementSelected,
		selectElement,
		setElementSelection,
		mergeElementsIntoSelection,
		selectElementRange,
		addElementToSelection,
		removeElementFromSelection,
		toggleElementSelection,
		clearElementSelection,
		handleElementClick,
	};
}
