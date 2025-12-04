import type { RefAttributes } from "react";
import type { PopoverProps as AriaPopoverProps } from "react-aria-components";
import { Popover as AriaPopover } from "react-aria-components";
import { cx } from "@/utils/cx";

interface PopoverProps extends AriaPopoverProps, RefAttributes<HTMLElement> {
    size: "sm" | "md";
    width?: number | string;
}

export const Popover = (props: PopoverProps) => {
    const { width, ...rest } = props;
    return (
        <AriaPopover
            placement="bottom"
            containerPadding={0}
            offset={4}
            {...rest}
            style={width !== undefined ? { ...(rest.style ?? {}), width } : rest.style}
            className={(state) =>
                cx(
                    "max-h-64! w-(--trigger-width) origin-(--trigger-anchor-point) overflow-x-hidden overflow-y-auto rounded-lg bg-primary py-1 shadow-lg ring-1 ring-secondary_alt outline-hidden will-change-transform",

                    state.isEntering &&
                        "duration-150 ease-out animate-in fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
                    state.isExiting &&
                        "duration-100 ease-in animate-out fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5",
                    props.size === "md" && "max-h-80!",

                    typeof rest.className === "function" ? rest.className(state) : rest.className,
                )
            }
        />
    );
};

