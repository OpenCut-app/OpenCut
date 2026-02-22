import type { Bookmark } from "@/types/timeline";
import { roundToFrame } from "@/lib/time";

export const BOOKMARK_TIME_EPSILON = 0.001;

function bookmarkTimeEqual({
	bookmarkTime,
	frameTime,
}: {
	bookmarkTime: number;
	frameTime: number;
}): boolean {
	return Math.abs(bookmarkTime - frameTime) < BOOKMARK_TIME_EPSILON;
}

export function findBookmarkIndex({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: number;
}): number {
	return bookmarks.findIndex((bookmark) =>
		bookmarkTimeEqual({ bookmarkTime: bookmark.time, frameTime }),
	);
}

export function isBookmarkAtTime({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: number;
}): boolean {
	return bookmarks.some((bookmark) =>
		bookmarkTimeEqual({ bookmarkTime: bookmark.time, frameTime }),
	);
}

export function toggleBookmarkInArray({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: number;
}): Bookmark[] {
	const bookmarkIndex = findBookmarkIndex({ bookmarks, frameTime });

	if (bookmarkIndex !== -1) {
		return bookmarks.filter((_, index) => index !== bookmarkIndex);
	}

	const newBookmarks = [...bookmarks, { time: frameTime }];
	return newBookmarks.slice().sort((a, b) => a.time - b.time);
}

export function removeBookmarkFromArray({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: number;
}): Bookmark[] {
	return bookmarks.filter(
		(bookmark) =>
			!bookmarkTimeEqual({ bookmarkTime: bookmark.time, frameTime }),
	);
}

export function updateBookmarkInArray({
	bookmarks,
	frameTime,
	updates,
}: {
	bookmarks: Bookmark[];
	frameTime: number;
	updates: Partial<Omit<Bookmark, "time">>;
}): Bookmark[] {
	const index = findBookmarkIndex({ bookmarks, frameTime });
	if (index === -1) {
		return bookmarks;
	}

	const updated = { ...bookmarks[index], ...updates };
	const result = [...bookmarks];
	result[index] = updated;
	return result;
}

export function moveBookmarkInArray({
	bookmarks,
	fromTime,
	toTime,
}: {
	bookmarks: Bookmark[];
	fromTime: number;
	toTime: number;
}): Bookmark[] {
	const index = findBookmarkIndex({ bookmarks, frameTime: fromTime });
	if (index === -1) {
		return bookmarks;
	}

	const updated = { ...bookmarks[index], time: toTime };
	const result = [...bookmarks];
	result[index] = updated;
	return result.slice().sort((a, b) => a.time - b.time);
}

export function getFrameTime({
	time,
	fps,
}: {
	time: number;
	fps: number;
}): number {
	return roundToFrame({ time, fps });
}

export function getBookmarkAtTime({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: number;
}): Bookmark | null {
	const index = findBookmarkIndex({ bookmarks, frameTime });
	return index === -1 ? null : bookmarks[index];
}

export function getBookmarksActiveAtTime({
	bookmarks,
	time,
}: {
	bookmarks: Bookmark[];
	time: number;
}): Bookmark[] {
	return bookmarks.filter((bookmark) => {
		const start = bookmark.time;
		const end =
			bookmark.duration != null && bookmark.duration > 0
				? start + bookmark.duration
				: start;
		return (
			time >= start - BOOKMARK_TIME_EPSILON &&
			time <= end + BOOKMARK_TIME_EPSILON
		);
	});
}
