import { ArrowBack, ArrowForward } from "@mui/icons-material";
import Button from "@mui/material/Button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/utils/cx";
import type { PaginationRootProps } from "./pagination-base";
import { Pagination as PaginationPrimitiveBase } from "./pagination-base";

interface PaginationProps extends Partial<Omit<PaginationRootProps, "children">> {
    /** Whether the pagination buttons are rounded. */
    rounded?: boolean;
}

const PaginationItem = ({ value, rounded, isCurrent }: { value: number; rounded?: boolean; isCurrent: boolean }) => {
    return (
        <PaginationPrimitiveBase.Item
            value={value}
            isCurrent={isCurrent}
            className={({ isSelected }) =>
                cx(
                    "flex size-10 cursor-pointer items-center justify-center p-3 text-sm font-medium text-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-secondary focus-visible:z-10 focus-visible:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2",
                    rounded ? "rounded-full" : "rounded-lg",
                    isSelected && "bg-primary_hover text-secondary",
                )
            }
        >
            {value}
        </PaginationPrimitiveBase.Item>
    );
};

interface MobilePaginationProps {
    /** The current page. */
    page?: number;
    /** The total number of pages. */
    total?: number;
    /** The class name of the pagination component. */
    className?: string;
    /** The function to call when the page changes. */
    onPageChange?: (page: number) => void;
}

const MobilePagination = ({ page = 1, total = 10, className, onPageChange }: MobilePaginationProps) => {
    return (
        <nav aria-label="Pagination" className={cx("flex items-center justify-between md:hidden", className)}>
            <Button
                aria-label="Go to previous page"
                size="small"
                variant="contained"
                startIcon={<ArrowBack fontSize="small" />}
                disabled={page <= 1}
                onClick={() => onPageChange?.(Math.max(1, page - 1))}
            >
                Previous
            </Button>

            <span className="text-sm text-fg-secondary">
                Page <span className="font-medium">{page}</span> of <span className="font-medium">{total}</span>
            </span>

            <Button
                aria-label="Go to next page"
                size="small"
                variant="contained"
                endIcon={<ArrowForward fontSize="small" />}
                disabled={page >= total}
                onClick={() => onPageChange?.(Math.min(total, page + 1))}
            >
                Next
            </Button>
        </nav>
    );
};

export const PaginationPageDefault = ({ rounded, page = 1, total = 10, className, ...props }: PaginationProps) => {
    const isDesktop = useBreakpoint("md");

    return (
        <PaginationPrimitiveBase.Root
            {...props}
            page={page}
            total={total}
            className={cx("flex w-full items-center justify-between gap-3 border-t border-secondary pt-4 md:pt-5", className)}
        >
            <div className="hidden flex-1 justify-start md:flex">
                <PaginationPrimitiveBase.PrevTrigger asChild>
                    <Button size="small" variant="text" startIcon={<ArrowBack fontSize="small" />}>
                        {isDesktop ? "Previous" : undefined}
                    </Button>
                </PaginationPrimitiveBase.PrevTrigger>
            </div>

            <PaginationPrimitiveBase.PrevTrigger asChild className="md:hidden">
                <Button size="small" variant="contained" startIcon={<ArrowBack fontSize="small" />}>
                    {isDesktop ? "Previous" : undefined}
                </Button>
            </PaginationPrimitiveBase.PrevTrigger>

            <PaginationPrimitiveBase.Context>
                {({ pages, currentPage, total }) => (
                    <>
                        <div className="hidden justify-center gap-0.5 md:flex">
                            {pages.map((page, index) =>
                                page.type === "page" ? (
                                    <PaginationItem key={index} rounded={rounded} {...page} />
                                ) : (
                                    <PaginationPrimitiveBase.Ellipsis key={index} className="flex size-10 shrink-0 items-center justify-center text-tertiary">
                                        &#8230;
                                    </PaginationPrimitiveBase.Ellipsis>
                                ),
                            )}
                        </div>

                        <div className="flex justify-center text-sm whitespace-pre text-fg-secondary md:hidden">
                            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{total}</span>
                        </div>
                    </>
                )}
            </PaginationPrimitiveBase.Context>

            <div className="hidden flex-1 justify-end md:flex">
                <PaginationPrimitiveBase.NextTrigger asChild>
                    <Button size="small" variant="text" endIcon={<ArrowForward fontSize="small" />}>
                        {isDesktop ? "Next" : undefined}
                    </Button>
                </PaginationPrimitiveBase.NextTrigger>
            </div>
            <PaginationPrimitiveBase.NextTrigger asChild className="md:hidden">
                <Button size="small" variant="contained" endIcon={<ArrowForward fontSize="small" />}>
                    {isDesktop ? "Next" : undefined}
                </Button>
            </PaginationPrimitiveBase.NextTrigger>
        </PaginationPrimitiveBase.Root>
    );
};

export const PaginationPageMinimalCenter = ({ rounded, page = 1, total = 10, className, ...props }: PaginationProps) => {
    const isDesktop = useBreakpoint("md");

    return (
        <PaginationPrimitiveBase.Root
            {...props}
            page={page}
            total={total}
            className={cx("flex w-full items-center justify-between gap-3 border-t border-secondary pt-4 md:pt-5", className)}
        >
            <div className="flex flex-1 justify-start">
                <PaginationPrimitiveBase.PrevTrigger asChild>
                    <Button size="small" variant="contained" startIcon={<ArrowBack fontSize="small" />}>
                        {isDesktop ? "Previous" : undefined}
                    </Button>
                </PaginationPrimitiveBase.PrevTrigger>
            </div>

            <PaginationPrimitiveBase.Context>
                {({ pages, currentPage, total }) => (
                    <>
                        <div className="hidden justify-center gap-0.5 md:flex">
                            {pages.map((page, index) =>
                                page.type === "page" ? (
                                    <PaginationItem key={index} rounded={rounded} {...page} />
                                ) : (
                                    <PaginationPrimitiveBase.Ellipsis key={index} className="flex size-10 shrink-0 items-center justify-center text-tertiary">
                                        &#8230;
                                    </PaginationPrimitiveBase.Ellipsis>
                                ),
                            )}
                        </div>

                        <div className="flex justify-center text-sm whitespace-pre text-fg-secondary md:hidden">
                            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{total}</span>
                        </div>
                    </>
                )}
            </PaginationPrimitiveBase.Context>

            <div className="flex flex-1 justify-end">
                <PaginationPrimitiveBase.NextTrigger asChild>
                    <Button size="small" variant="contained" endIcon={<ArrowForward fontSize="small" />}>
                        {isDesktop ? "Next" : undefined}
                    </Button>
                </PaginationPrimitiveBase.NextTrigger>
            </div>
        </PaginationPrimitiveBase.Root>
    );
};

export const PaginationCardDefault = ({ rounded, page = 1, total = 10, ...props }: PaginationProps) => {
    const isDesktop = useBreakpoint("md");

    return (
        <PaginationPrimitiveBase.Root
            {...props}
            page={page}
            total={total}
            className="flex w-full items-center justify-between gap-3 border-t border-secondary px-4 py-3 md:px-6 md:pt-3 md:pb-4"
        >
            <div className="flex flex-1 justify-start">
                <PaginationPrimitiveBase.PrevTrigger asChild>
                    <Button size="small" variant="contained" startIcon={<ArrowBack fontSize="small" />}>
                        {isDesktop ? "Previous" : undefined}
                    </Button>
                </PaginationPrimitiveBase.PrevTrigger>
            </div>

            <PaginationPrimitiveBase.Context>
                {({ pages, currentPage, total }) => (
                    <>
                        <div className="hidden justify-center gap-0.5 md:flex">
                            {pages.map((page, index) =>
                                page.type === "page" ? (
                                    <PaginationItem key={index} rounded={rounded} {...page} />
                                ) : (
                                    <PaginationPrimitiveBase.Ellipsis key={index} className="flex size-10 shrink-0 items-center justify-center text-tertiary">
                                        &#8230;
                                    </PaginationPrimitiveBase.Ellipsis>
                                ),
                            )}
                        </div>

                        <div className="flex justify-center text-sm whitespace-pre text-fg-secondary md:hidden">
                            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{total}</span>
                        </div>
                    </>
                )}
            </PaginationPrimitiveBase.Context>

            <div className="flex flex-1 justify-end">
                <PaginationPrimitiveBase.NextTrigger asChild>
                    <Button size="small" variant="contained" endIcon={<ArrowForward fontSize="small" />}>
                        {isDesktop ? "Next" : undefined}
                    </Button>
                </PaginationPrimitiveBase.NextTrigger>
            </div>
        </PaginationPrimitiveBase.Root>
    );
};

interface PaginationCardMinimalProps {
    /** The current page. */
    page?: number;
    /** The total number of pages. */
    total?: number;
    /** The alignment of the pagination. */
    align?: "left" | "center" | "right";
    /** The class name of the pagination component. */
    className?: string;
    /** The function to call when the page changes. */
    onPageChange?: (page: number) => void;
}

export const PaginationCardMinimal = ({ page = 1, total = 10, align = "left", onPageChange, className }: PaginationCardMinimalProps) => {
    return (
        <div className={cx("border-t border-secondary px-4 py-3 md:px-6 md:pt-3 md:pb-4", className)}>
            <MobilePagination page={page} total={total} onPageChange={onPageChange} />

            <nav aria-label="Pagination" className={cx("hidden items-center gap-3 md:flex", align === "center" && "justify-between")}>
                <div className={cx(align === "center" && "flex flex-1 justify-start")}>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<ArrowBack fontSize="small" />}
                        disabled={page === 1}
                        onClick={() => onPageChange?.(Math.max(1, page - 1))}
                    >
                        Previous
                    </Button>
                </div>

                <span
                    className={cx(
                        "text-sm font-medium text-fg-secondary",
                        align === "right" && "order-first mr-auto",
                        align === "left" && "order-last ml-auto",
                    )}
                >
                    Page {page} of {total}
                </span>

                <div className={cx(align === "center" && "flex flex-1 justify-end")}>
                    <Button
                        size="small"
                        variant="contained"
                        endIcon={<ArrowForward fontSize="small" />}
                        disabled={page === total}
                        onClick={() => onPageChange?.(Math.min(total, page + 1))}
                    >
                        Next
                    </Button>
                </div>
            </nav>
        </div>
    );
};

interface PaginationButtonGroupProps extends Partial<Omit<PaginationRootProps, "children">> {
    /** The alignment of the pagination. */
    align?: "left" | "center" | "right";
}

export const PaginationButtonGroup = ({ align = "left", page = 1, total = 10, ...props }: PaginationButtonGroupProps) => {
    const isDesktop = useBreakpoint("md");

    return (
        <div
            className={cx(
                "flex border-t border-secondary px-4 py-3 md:px-6 md:pt-3 md:pb-4",
                align === "left" && "justify-start",
                align === "center" && "justify-center",
                align === "right" && "justify-end",
            )}
        >
            <PaginationPrimitiveBase.Root {...props} page={page} total={total}>
                <PaginationPrimitiveBase.Context>
                    {({ pages }) => (
                        <ButtonGroup size="md">
                            <PaginationPrimitiveBase.PrevTrigger asChild>
                                <ButtonGroupItem iconLeading={ArrowBack}>{isDesktop ? "Previous" : undefined}</ButtonGroupItem>
                            </PaginationPrimitiveBase.PrevTrigger>

                            {pages.map((p, index) =>
                                p.type === "page" ? (
                                    <PaginationPrimitiveBase.Item key={index} {...p} asChild>
                                        <ButtonGroupItem isSelected={p.isCurrent} className="size-10 items-center justify-center">
                                            {p.value}
                                        </ButtonGroupItem>
                                    </PaginationPrimitiveBase.Item>
                                ) : (
                                    <PaginationPrimitiveBase.Ellipsis key={index}>
                                        <ButtonGroupItem className="pointer-events-none size-10 items-center justify-center rounded-none!">
                                            &#8230;
                                        </ButtonGroupItem>
                                    </PaginationPrimitiveBase.Ellipsis>
                                ),
                            )}

                            <PaginationPrimitiveBase.NextTrigger asChild>
                                <ButtonGroupItem iconTrailing={ArrowForward}>{isDesktop ? "Next" : undefined}</ButtonGroupItem>
                            </PaginationPrimitiveBase.NextTrigger>
                        </ButtonGroup>
                    )}
                </PaginationPrimitiveBase.Context>
            </PaginationPrimitiveBase.Root>
        </div>
    );
};

// Export a simple Pagination component for easy usage in pages
export const Pagination = (props: PaginationProps) => <PaginationPageDefault {...props} />;

// Also export the primitive API for advanced compositions
export { PaginationPrimitiveBase as PaginationPrimitive };

