import { OpenInNew } from "@mui/icons-material";
import { Avatar } from "@mui/material";
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { cx } from "@/utils/cx";

export type Article = {
    id: string;
    href: string;
    thumbnailUrl: string;
    title: string;
    summary: string;
    category: {
        href: string;
        name: string;
    };
    author: {
        href: string;
        name: string;
        avatarUrl: string;
    };
    publishedAt: string;
    readingTime: string;
    tags: Array<{ name: string; color: "primary" | "secondary" | "success" | "error" | "warning" | "info" | "default"; href: string }>;
    isFeatured?: boolean;
};

export const Simple01Vertical = ({ article, imageClassName }: { article: Article; imageClassName?: string }) => (
    <article className="flex flex-col gap-4">
        <a href={article.href} className="overflow-hidden rounded-2xl" tabIndex={-1}>
            <img
                src={article.thumbnailUrl}
                alt={article.title}
                className={cx("aspect-[1.5] w-full object-cover transition duration-100 ease-linear hover:scale-105", imageClassName)}
            />
        </a>

        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-brand-secondary">{article.category.name}</span>
                <div className="flex flex-col gap-1">
                    <a
                        href={article.href}
                        className="group/title flex justify-between gap-x-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {article.title}
                        <OpenInNew
                            className="mt-0.5 size-6 shrink-0 text-fg-quaternary transition duration-100 ease-linear group-hover/title:text-fg-quaternary_hover"
                            aria-hidden="true"
                        />
                    </a>

                    <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
                </div>
            </div>

            <div className="flex gap-2">
                <a
                    href={article.author.href}
                    tabIndex={-1}
                    className="flex"
                    aria-label={article.author.name}
                    title={article.author.name}
                >
                    <Avatar
                      alt={article.author.name}
                      src={article.author.avatarUrl}
                      sx={{ width: 40, height: 40 }}
                    />
                </a>

                <div>
                    <a
                        href={article.author.href}
                        className="block rounded-xs text-sm font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {article.author.name}
                    </a>
                    <time className="block text-sm text-tertiary">{article.publishedAt}</time>
                </div>
            </div>
        </div>
    </article>
);

export const Simple02Vertical = ({
    article,
    badgeTheme = "light",
    imageClassName,
}: {
    article: Article;
    badgeTheme?: "light" | "dark";
    imageClassName?: string;
}) => (
    <article className="flex flex-col gap-4">
        <a href={article.href} className="overflow-hidden" tabIndex={-1}>
            <img src={article.thumbnailUrl} alt={article.title} className={cx("aspect-[1.5] w-full object-cover", imageClassName)} />
        </a>

        <div className="flex flex-col gap-5">
            <div className="flex flex-col items-start gap-3">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        label={article.category.name}
                        color="primary"
                        size="small"
                        sx={{
                            backgroundColor: badgeTheme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'primary.main',
                            color: badgeTheme === 'light' ? 'primary.main' : 'white',
                            fontWeight: 600
                        }}
                    />
                    <Chip
                        label={article.readingTime}
                        color="primary"
                        size="small"
                        sx={{
                            backgroundColor: badgeTheme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'primary.main',
                            color: badgeTheme === 'light' ? 'primary.main' : 'white',
                            fontWeight: 600
                        }}
                    />
                </Box>
                <div className="flex flex-col gap-1">
                    <a
                        href={article.category.href}
                        className="flex justify-between gap-x-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {article.title}
                        <OpenInNew className="mt-0.5 size-6 shrink-0 text-fg-quaternary" aria-hidden="true" />
                    </a>
                    <p className="line-clamp-2 text-md text-tertiary md:line-clamp-none">{article.summary}</p>
                </div>
            </div>

            <div className="flex gap-2">
                <a
                    href={article.author.href}
                    tabIndex={-1}
                    className="flex"
                    aria-label={article.author.name}
                    title={article.author.name}
                >
                    <Avatar
                      alt={article.author.name}
                      src={article.author.avatarUrl}
                      sx={{ width: 40, height: 40 }}
                    />
                </a>

                <div>
                    <a
                        href={article.author.href}
                        className="block rounded-xs text-sm font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {article.author.name}
                    </a>
                    <time className="block text-sm text-tertiary">{article.publishedAt}</time>
                </div>
            </div>
        </div>
    </article>
);

export const Simple03Vertical = ({
    article,
    imageClassName,
    titleClassName,
    className,
}: {
    article: Article;
    imageClassName?: string;
    titleClassName?: string;
    className?: string;
}) => (
    <article className={cx("flex flex-col gap-4", className)}>
        <a href={article.href} className="overflow-hidden rounded-2xl" tabIndex={-1}>
            <img src={article.thumbnailUrl} alt={article.title} className={cx("aspect-[1.5] w-full object-cover", imageClassName)} />
        </a>

        <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-semibold text-brand-secondary">
                    {article.author.name} • <time>{article.publishedAt}</time>
                </p>
                <div className="flex w-full flex-col gap-1">
                    <a
                        href={article.category.href}
                        className={cx(
                            "flex justify-between gap-x-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                            titleClassName,
                        )}
                    >
                        {article.title}
                        <OpenInNew className="mt-0.5 size-6 shrink-0 text-fg-quaternary" aria-hidden="true" />
                    </a>
                    <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
                </div>
            </div>

            <div className="flex gap-2">
                {article.tags.map((tag) => (
                    <a key={tag.name} href={tag.href} className="rounded-xl outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={`View articles tagged with ${tag.name}`}>
                        <Chip label={tag.name} color={tag.color} size="small" />
                    </a>
                ))}
            </div>
        </div>
    </article>
);

export const Simple07Horizontal = ({ article, imageClassName, className }: { article: Article; imageClassName?: string; className?: string }) => (
    <article className={cx("flex flex-col gap-4", className)}>
        <div className="relative">
            <a href={article.href} className="w-full" tabIndex={-1}>
                <img src={article.thumbnailUrl} alt={article.title} className={cx("aspect-[1.5] w-full object-cover", imageClassName)} />
            </a>
            <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-linear-to-b from-transparent to-black/40">
                <div className="relative flex items-start justify-between bg-alpha-white/30 p-4 backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-alpha-white/30 md:p-5">
                    <div>
                        <a
                            href={article.author.href}
                            className="block rounded-xs text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            {article.author.name}
                        </a>
                        <time className="block text-sm text-white">{article.publishedAt}</time>
                    </div>
                    <a
                        href={article.category.href}
                        className="rounded-xs text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {article.category.name}
                    </a>
                </div>
            </div>
        </div>

        <div className="flex flex-col items-start gap-5">
            <div className="flex flex-col gap-1">
                <a
                    href={article.category.href}
                    className="flex justify-between gap-x-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    {article.title}
                </a>
                <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
            </div>

            <Button href={article.href} size="large" variant="text" endIcon={<OpenInNew />}>
                Read post
            </Button>
        </div>
    </article>
);

export const Simple01Horizontal = ({ article, imageClassName }: { article: Article; imageClassName?: string }) => (
    <article className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <a href={article.href} className="shrink-0 overflow-hidden rounded-2xl" tabIndex={-1}>
            <img src={article.thumbnailUrl} alt={article.title} className={cx("aspect-[1.5] w-full object-cover xl:w-80", imageClassName)} />
        </a>

        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-brand-secondary">{article.category.name}</span>

                <div className="flex flex-col gap-1">
                    <a
                        href={article.category.href}
                        className="flex justify-between gap-x-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {article.title}
                    </a>

                    <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
                </div>
            </div>

            <div className="flex gap-2">
                <a
                    href={article.author.href}
                    tabIndex={-1}
                    className="flex"
                    aria-label={article.author.name}
                    title={article.author.name}
                >
                    <Avatar
                      alt={article.author.name}
                      src={article.author.avatarUrl}
                      sx={{ width: 40, height: 40 }}
                    />
                </a>

                <div>
                    <a
                        href={article.author.href}
                        className="block rounded-xs text-sm font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {article.author.name}
                    </a>
                    <time className="block text-sm text-tertiary">{article.publishedAt}</time>
                </div>
            </div>
        </div>
    </article>
);

export const Simple02Horizontal = ({ article }: { article: Article }) => (
    <article className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <a href={article.href} className="shrink-0 overflow-hidden" tabIndex={-1}>
            <img src={article.thumbnailUrl} alt={article.title} className="h-60 w-full object-cover lg:h-50 lg:w-91.5" />
        </a>

        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        label={article.category.name}
                        color="primary"
                        size="small"
                        sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            color: 'primary.main',
                            fontWeight: 600
                        }}
                    />
                    <Chip
                        label={article.readingTime}
                        color="primary"
                        size="small"
                        sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            color: 'primary.main',
                            fontWeight: 600
                        }}
                    />
                </Box>
                <div className="flex flex-col gap-2">
                    <a
                        href={article.href}
                        className="rounded-xs text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {article.title}
                    </a>

                    <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
                </div>
            </div>

            <div className="flex gap-2">
                <a
                    href={article.author.href}
                    tabIndex={-1}
                    className="flex"
                    aria-label={article.author.name}
                    title={article.author.name}
                >
                    <Avatar
                      alt={article.author.name}
                      src={article.author.avatarUrl}
                      sx={{ width: 40, height: 40 }}
                    />
                </a>

                <div>
                    <a
                        href={article.author.href}
                        className="block rounded-xs text-sm font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {article.author.name}
                    </a>
                    <time className="block text-sm text-tertiary">{article.publishedAt}</time>
                </div>
            </div>
        </div>
    </article>
);

export const Simple03Horizontal = ({ article, imageClassName }: { article: Article; imageClassName?: string }) => (
    <article className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <a href={article.href} className="shrink-0 overflow-hidden rounded-2xl" tabIndex={-1}>
            <img src={article.thumbnailUrl} alt={article.title} className={cx("aspect-[1.5] w-full object-cover xl:w-91.5", imageClassName)} />
        </a>

        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-brand-secondary">
                    <a href={article.author.href} className="rounded-xs outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2">
                        {article.author.name}
                    </a>{" "}
                    • <time>{article.publishedAt}</time>
                </p>
                <div className="flex flex-col gap-1">
                    <a
                        href={article.href}
                        className="rounded-xs text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {article.title}
                    </a>

                    <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
                </div>
            </div>

            <div className="flex gap-2">
                {article.tags.map((tag) => (
                    <a key={tag.name} href={tag.href} className="rounded-xl outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={`View articles tagged with ${tag.name}`}>
                        <Chip label={tag.name} color={tag.color} size="small" />
                    </a>
                ))}
            </div>
        </div>
    </article>
);

export const Simple04Horizontal = ({ article }: { article: Article }) => (
    <article className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="relative shrink-0">
            <a href={article.href} className="w-full" tabIndex={-1}>
                <img src={article.thumbnailUrl} alt={article.title} className="h-60 w-full object-cover lg:h-50 lg:w-80" />
            </a>
            <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-linear-to-b from-transparent to-black/40">
                <div className="relative flex items-start justify-between bg-alpha-white/30 p-4 backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-alpha-white/30">
                    <div>
                        <a
                            href={article.author.href}
                            className="block rounded-xs text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            {article.author.name}
                        </a>
                        <time className="block text-sm text-white">{article.publishedAt}</time>
                    </div>
                    <a
                        href={article.category.href}
                        className="rounded-xs text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {article.category.name}
                    </a>
                </div>
            </div>
        </div>

        <div className="flex flex-col items-start gap-6">
            <div className="flex flex-col gap-2">
                <a
                    href={article.category.href}
                    className="block rounded-xs text-xl font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 md:text-lg"
                >
                    {article.title}
                </a>
                <p className="line-clamp-2 text-md text-tertiary lg:line-clamp-3">{article.summary}</p>
            </div>

            <Button href="article.href" size="large" variant="text" endIcon="OpenInNew">
                Read post
            </Button>
        </div>
    </article>
);

export const CardFullWidthImage01Vertical = ({ article }: { article: Article }) => (
    <article className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-secondary ring-inset">
        <a href={article.href} tabIndex={-1}>
            <img src={article.thumbnailUrl} alt={article.title} className="h-50 w-full object-cover md:h-60" />
        </a>

        <div className="flex flex-col gap-6 p-5 pb-6 md:p-6">
            <div className="flex flex-col gap-2">
                <Button href={article.category.href} variant="text">
                    {article.category.name}
                </Button>
                <div className="flex flex-col gap-2">
                    <Button href={article.href} className="size-6 shrink-0" hidden variant="text">
                        {article.title}
                    </Button>
                    <p className="line-clamp-2 text-md text-tertiary md:line-clamp-3">{article.summary}</p>
                </div>
            </div>

            <div className="flex gap-2">
                <a
                    href={article.author.href}
                    tabIndex={-1}
                    className="flex"
                    aria-label={article.author.name}
                    title={article.author.name}
                >
                    <Avatar
                      alt={article.author.name}
                      src={article.author.avatarUrl}
                      sx={{ width: 40, height: 40 }}
                    />
                </a>

                <div>
                    <p className="text-sm font-semibold">
                        <Button href={article.author.href} className="text-primary" variant="text">
                            {article.author.name}
                        </Button>
                    </p>
                    <time className="block text-sm text-tertiary">{article.publishedAt}</time>
                </div>
            </div>
        </div>
    </article>
);

export const CardFullWidthImage02Vertical = ({ article }: { article: Article }) => (
    <article className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-secondary ring-inset">
        <a href={article.href} tabIndex={-1}>
            <img src={article.thumbnailUrl} alt={article.title} className="h-60 w-full object-cover" />
        </a>

        <div className="flex flex-col gap-6 p-5 pb-6 md:p-6">
            <div className="flex flex-col gap-4">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        label={article.category.name}
                        color="primary"
                        size="small"
                        sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            color: 'primary.main',
                            fontWeight: 600
                        }}
                    />
                    <Chip
                        label={article.readingTime}
                        color="primary"
                        size="small"
                        sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            color: 'primary.main',
                            fontWeight: 600
                        }}
                    />
                </Box>
                <div className="flex flex-col gap-2">
                    <Button href={article.href} className="size-6 shrink-0" hidden variant="text">
                        {article.title}
                    </Button>
                    <p className="line-clamp-2 text-md text-tertiary md:line-clamp-3">{article.summary}</p>
                </div>
            </div>

            <div className="flex gap-2">
                <a
                    href={article.author.href}
                    tabIndex={-1}
                    className="flex"
                    aria-label={article.author.name}
                    title={article.author.name}
                >
                    <Avatar
                      alt={article.author.name}
                      src={article.author.avatarUrl}
                      sx={{ width: 40, height: 40 }}
                    />
                </a>

                <div>
                    <p className="text-sm font-semibold">
                        <Button href="article.category.href" className="text-primary" variant="text">
                            {article.author.name}
                        </Button>
                    </p>
                    <time className="block text-sm text-tertiary">{article.publishedAt}</time>
                </div>
            </div>
        </div>
    </article>
);

export const CardFullWidthImage03Vertical = ({ article }: { article: Article }) => (
    <article className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-secondary ring-inset">
        <a href={article.href} tabIndex={-1}>
            <img src={article.thumbnailUrl} alt={article.title} className="h-60 w-full object-cover" />
        </a>

        <div className="flex flex-col gap-6 p-5 pb-6 md:p-6">
            <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-brand-secondary">
                    <Button href="article.author.href" variant="text">
                        {article.author.name}
                    </Button>{" "}
                    • <time>{article.publishedAt}</time>
                </p>
                <div className="flex flex-col gap-2">
                    <Button href={article.href} className="size-6 shrink-0" hidden variant="text">
                        {article.title}
                    </Button>
                    <p className="line-clamp-2 text-md text-tertiary md:line-clamp-3">{article.summary}</p>
                </div>
            </div>

            <div className="flex gap-2">
                {article.tags.map((tag) => (
                    <a key={tag.name} href={tag.href} className="rounded-xl outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={`View articles tagged with ${tag.name}`}>
                        <Chip label={tag.name} color={tag.color} size="small" />
                    </a>
                ))}
            </div>
        </div>
    </article>
);

export const CardFullWidthImage04Vertical = ({ article }: { article: Article }) => (
    <article className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-secondary ring-inset">
        <div className="relative shrink-0">
            <a href={article.href} className="w-full" tabIndex={-1}>
                <img src={article.thumbnailUrl} alt={article.title} className="h-60 w-full object-cover md:h-70" />
            </a>
            <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-linear-to-b from-transparent to-black/40">
                <div className="relative flex items-start justify-between bg-alpha-white/30 p-4 backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-alpha-white/30 md:p-6">
                    <div>
                        <p className="text-sm font-semibold">
                            <Button href={article.author.href} className="text-white" variant="text">
                                {article.author.name}
                            </Button>
                        </p>
                        <time className="block text-sm text-white">{article.publishedAt}</time>
                    </div>
                    <p className="text-sm font-semibold">
                        <Button href={article.category.href} className="text-white" variant="text">
                            {article.category.name}
                        </Button>
                    </p>
                </div>
            </div>
        </div>

        <div className="flex flex-col gap-6 p-5 pb-6 md:p-6">
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                    <Button href={article.href} className="size-6 shrink-0" hidden variant="text">
                        {article.title}
                    </Button>
                    <p className="line-clamp-2 text-md text-tertiary md:line-clamp-3">{article.summary}</p>
                </div>
            </div>

            <Button href={article.href} size="large" variant="text" endIcon={<OpenInNew />}>
                Read post
            </Button>
        </div>
    </article>
);

export const CardFullWidthImage01Horizontal = ({ article }: { article: Article }) => (
    <article className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-secondary ring-inset md:flex-row md:items-start">
        <a href={article.href} className="shrink-0" tabIndex={-1}>
            <img src={article.thumbnailUrl} alt={article.title} className="h-60 w-full object-cover md:h-60 md:w-80" />
        </a>

        <div className="flex flex-col gap-6 p-5 pb-6 md:p-6">
            <div className="flex flex-col gap-2">
                <Button href={article.category.href} variant="text">
                    {article.category.name}
                </Button>
                <div className="flex flex-col gap-2">
                    <Button href={article.href} size="large" className="text-xl font-semibold text-primary md:text-lg" variant="text">
                        {article.title}
                    </Button>

                    <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
                </div>
            </div>

            <div className="flex gap-2">
                <a
                    href={article.author.href}
                    tabIndex={-1}
                    className="flex"
                    aria-label={article.author.name}
                    title={article.author.name}
                >
                    <Avatar
                      alt={article.author.name}
                      src={article.author.avatarUrl}
                      sx={{ width: 40, height: 40 }}
                    />
                </a>

                <div>
                    <p className="text-sm font-semibold">
                        <Button href={article.author.href} className="text-primary" variant="text">
                            {article.author.name}
                        </Button>
                    </p>
                    <time className="block text-sm text-tertiary">{article.publishedAt}</time>
                </div>
            </div>
        </div>
    </article>
);

export const CardFullWidthImage02Horizontal = ({ article }: { article: Article }) => (
    <article className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-secondary ring-inset md:flex-row md:items-start">
        <a href={article.href} className="shrink-0" tabIndex={-1}>
            <img src={article.thumbnailUrl} alt={article.title} className="h-60 w-full object-cover md:h-60.5 md:w-80" />
        </a>

        <div className="flex flex-col gap-6 p-5 pb-6 md:p-6">
            <div className="flex flex-col gap-4">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        label={article.category.name}
                        color="primary"
                        size="small"
                        sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            color: 'primary.main',
                            fontWeight: 600
                        }}
                    />
                    <Chip
                        label={article.readingTime}
                        color="primary"
                        size="small"
                        sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            color: 'primary.main',
                            fontWeight: 600
                        }}
                    />
                </Box>
                <div className="flex flex-col gap-2">
                    <Button href={article.href} size="large" className="text-xl font-semibold text-primary md:text-lg" variant="text">
                        {article.title}
                    </Button>

                    <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
                </div>
            </div>

            <div className="flex gap-2">
                <a
                    href={article.author.href}
                    tabIndex={-1}
                    className="flex"
                    aria-label={article.author.name}
                    title={article.author.name}
                >
                    <Avatar
                      alt={article.author.name}
                      src={article.author.avatarUrl}
                      sx={{ width: 40, height: 40 }}
                    />
                </a>

                <div>
                    <p className="text-sm font-semibold">
                        <Button href="article.author.href" className="text-primary" variant="text">
                            {article.author.name}
                        </Button>
                    </p>
                    <time className="block text-sm text-tertiary">{article.publishedAt}</time>
                </div>
            </div>
        </div>
    </article>
);

export const CardFullWidthImage03Horizontal = ({ article }: { article: Article }) => (
    <article className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-secondary ring-inset md:flex-row md:items-start">
        <a href={article.href} className="shrink-0" tabIndex={-1}>
            <img src={article.thumbnailUrl} alt={article.title} className="h-60 w-full object-cover md:h-60 md:w-80" />
        </a>

        <div className="flex flex-col gap-6 p-5 pb-6 md:p-6">
            <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-brand-secondary">
                    <Button href={article.author.href} variant="text">
                        {article.author.name}
                    </Button>{" "}
                    • <time>{article.publishedAt}</time>
                </p>
                <div className="flex flex-col gap-2">
                    <Button href={article.href} size="large" className="text-xl font-semibold text-primary md:text-lg" variant="text">
                        {article.title}
                    </Button>

                    <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
                </div>
            </div>

            <div className="flex gap-2">
                {article.tags.map((tag) => (
                    <a key={tag.name} href={tag.href} className="rounded-xl outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={`View articles tagged with ${tag.name}`}>
                        <Chip label={tag.name} color={tag.color} size="small" />
                    </a>
                ))}
            </div>
        </div>
    </article>
);

export const CardFullWidthImage04Horizontal = ({ article }: { article: Article }) => (
    <article className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-secondary ring-inset md:flex-row md:items-start">
        <div className="relative shrink-0">
            <a href={article.href} className="w-full" tabIndex={-1}>
                <img src={article.thumbnailUrl} alt={article.title} className="h-60 w-full object-cover md:h-60 md:w-80" />
            </a>
            <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-linear-to-b from-transparent to-black/40">
                <div className="relative flex items-start justify-between bg-alpha-white/30 p-4 backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-alpha-white/30 md:p-6">
                    <div>
                        <p className="text-sm font-semibold">
                            <Button href={article.author.href} className="text-white" variant="text">
                                {article.author.name}
                            </Button>
                        </p>
                        <time className="block text-sm text-white">{article.publishedAt}</time>
                    </div>
                    <p className="text-sm font-semibold">
                        <Button href={article.category.href} className="text-white" variant="text">
                            {article.category.name}
                        </Button>
                    </p>
                </div>
            </div>
        </div>

        <div className="flex flex-col gap-6 p-5 pb-6 md:p-6">
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                    <Button href={article.href} size="large" className="text-xl font-semibold text-primary md:text-lg" variant="text">
                        {article.title}
                    </Button>

                    <p className="line-clamp-2 text-md text-tertiary md:line-clamp-3">{article.summary}</p>
                </div>
            </div>

            <Button href={article.href} size="large" variant="text" endIcon={<OpenInNew />}>
                Read post
            </Button>
        </div>
    </article>
);


