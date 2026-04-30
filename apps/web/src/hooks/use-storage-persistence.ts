"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "neuralcut-storage-persist-dismissed";

function isFirefox(): boolean {
	return navigator.userAgent.toLowerCase().includes("firefox");
}

export function useStoragePersistence() {
	const [showDialog, setShowDialog] = useState(false);

	useEffect(() => {
		if (!navigator.storage?.persist) return;

		const run = async () => {
			const alreadyPersisted = await navigator.storage.persisted();
			if (alreadyPersisted) return;

			const dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
			if (dismissed) return;

			if (isFirefox()) {
				setShowDialog(true);
			} else {
				await navigator.storage.persist();
			}
		};

		run();
	}, []);

	const onConfirm = async () => {
		setShowDialog(false);
		await navigator.storage.persist();
	};

	const onDismiss = () => {
		setShowDialog(false);
		localStorage.setItem(DISMISSED_KEY, "true");
	};

	return { showDialog, onConfirm, onDismiss };
}
