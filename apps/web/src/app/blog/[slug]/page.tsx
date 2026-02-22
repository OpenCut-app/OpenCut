import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BasePage } from "@/app/base-page";
import Prose from "@/components/ui/prose";
import { Separator } from "@/components/ui/separator";
import { getPosts, getSinglePost, processHtmlContent } from "@/lib/blog/query";
import type { Author, Post } from "@/types/blog";

type PageProps = {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const slug = (await params).slug;

	const data = await getSinglePost({ slug });

	if (!data || !data.post) return {};

	return {
		title: data.post.title,
		description: data.post.description,
		twitter: {
			title: `${data.post.title}`,
			description: `${data.post.description}`,
			card: "summary_large_image",
			images: [
				{
					url: data.post.coverImage,
					width: "1200",
					height: "630",
					alt: data.post.title,
				},
			],
		},
		openGraph: {
			type: "article",
			images: [
				{
					url: data.post.coverImage,
					width: "1200",
					height: "630",
					alt: data.post.title,
				},
			],
			title: data.post.title,
			description: data.post.description,
			publishedTime: new Date(data.post.publishedAt).toISOString(),
			authors: data.post.authors.map((author: Author) => author.name),
		},
	};
}

export async function generateStaticParams() {
	const data = await getPosts();
	if (!data || !data.posts.length) return [];

	return data.posts.map((post) => ({
		slug: post.slug,
	}));
}

export default async function BlogPostPage({ params }: PageProps) {
	const slug = (await params).slug;
	const data = await getSinglePost({ slug });
	if (!data || !data.post) return notFound();

	const html = await processHtmlContent({ html: data.post.content });

	return (
		<BasePage>
			<PostHeader post={data.post} />
			<Separator />
			<PostContent html={html} />
		</BasePage>
	);
}

function PostHeader({ post }: { post: Post }) {
	const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	return (
		<div className="flex flex-col items-center justify-center gap-8">
			<PostMeta date={formattedDate} publishedAt={post.publishedAt} />
			<PostTitle title={post.title} />
			{post.coverImage && <PostCoverImage post={post} />}
		</div>
	);
}

function PostCoverImage({ post }: { post: Post }) {
	return (
		<div className="relative aspect-video overflow-hidden rounded-lg w-full mt-4">
			<Image
				src={post.coverImage}
				alt={post.title}
				loading="eager"
				fill
				className="rounded-lg object-cover"
			/>
		</div>
	);
}

function PostMeta({ date, publishedAt }: { date: string; publishedAt: Date }) {
	return (
		<div className="flex items-center justify-center">
			<time dateTime={publishedAt.toString()}>{date}</time>
		</div>
	);
}

function PostTitle({ title }: { title: string }) {
	return (
		<h1 className="text-5xl font-bold tracking-tight md:text-4xl text-center">
			{title}
		</h1>
	);
}

function PostContent({ html }: { html: string }) {
	return (
		<section className="">
			<Prose html={html} />
		</section>
	);
}
