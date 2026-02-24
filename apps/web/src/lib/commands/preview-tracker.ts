export class PreviewTracker<T> {
	private snapshot: T | null = null;

	begin({ state }: { state: T }): void {
		if (this.snapshot === null) {
			this.snapshot = structuredClone(state);
		}
	}

	isActive(): boolean {
		return this.snapshot !== null;
	}

	getSnapshot(): T | null {
		return this.snapshot;
	}

	end(): T | null {
		const snapshot = this.snapshot;
		this.snapshot = null;
		return snapshot;
	}
}
