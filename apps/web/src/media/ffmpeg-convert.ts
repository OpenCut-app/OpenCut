export async function convertVideoToH264({
	file,
}: {
	file: File;
}): Promise<File> {
	const formData = new FormData();
	formData.append("file", file);

	const response = await fetch("/api/convert-video", {
		method: "POST",
		body: formData,
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.error || `Conversion failed: ${response.status}`);
	}

	const blob = await response.blob();
	const baseName = file.name.replace(/\.[^.]+$/, "");
	return new File([blob], `${baseName}.mp4`, { type: "video/mp4" });
}
