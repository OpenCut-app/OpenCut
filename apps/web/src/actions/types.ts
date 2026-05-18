import type { MutableRefObject } from "react";
import type { TAction } from "./definitions";
import { ACTIONS } from "./definitions";

export type { TAction };

export type TActionArgsMap = {
	"seek-forward": { seconds: number } | undefined;
	"seek-backward": { seconds: number } | undefined;
	"jump-forward": { seconds: number } | undefined;
	"jump-backward": { seconds: number } | undefined;
	"remove-media-asset": { projectId: string; assetId: string };
	"remove-media-assets": { projectId: string; assetIds: string[] };
};

type TKeysWithValueUndefined<T> = {
	[K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

export type TActionWithArgs = keyof TActionArgsMap;

export type TActionWithOptionalArgs =
	| TActionWithNoArgs
	| TKeysWithValueUndefined<TActionArgsMap>;

export type TActionWithNoArgs = Exclude<TAction, TActionWithArgs>;

const ACTION_KEYS_SET: ReadonlySet<string> = new Set(Object.keys(ACTIONS));

const ACTIONS_WITH_REQUIRED_ARGS: ReadonlySet<string> = new Set([
	"remove-media-asset",
	"remove-media-assets",
]);

export function isAction(value: string): value is TAction {
	return ACTION_KEYS_SET.has(value);
}

export function isActionWithOptionalArgs(value: string): value is TActionWithOptionalArgs {
	if (!isAction(value)) return false;
	// Actions that require mandatory (non-undefined) args cannot be used as keybindings
	return !ACTIONS_WITH_REQUIRED_ARGS.has(value);
}

export type TArgOfAction<A extends TAction> = A extends TActionWithArgs
	? TActionArgsMap[A]
	: undefined;

export type TActionFunc<A extends TAction> = A extends TActionWithArgs
	? (arg: TArgOfAction<A>, trigger?: TInvocationTrigger) => void
	: (_?: undefined, trigger?: TInvocationTrigger) => void;

export type TInvocationTrigger = "keypress" | "mouseclick";

export type TBoundActionList = {
	[A in TAction]?: Array<TActionFunc<A>>;
};

export type TActionHandlerOptions =
	| MutableRefObject<boolean>
	| boolean
	| undefined;
