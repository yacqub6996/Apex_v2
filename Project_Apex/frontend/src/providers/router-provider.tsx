import { type PropsWithChildren } from "react";
import { RouterProvider } from "react-aria-components";
import { useRouter } from "@tanstack/react-router";
import type { NavigateOptions } from "@tanstack/react-router";

declare module "react-aria-components" {
    interface RouterConfig {
        routerOptions: NavigateOptions;
    }
}

export const RouteProvider = ({ children }: PropsWithChildren) => {
    const router = useRouter();

    // Wrap the navigate function to match the expected signature
    const wrappedNavigate = (path: string, routerOptions?: NavigateOptions) => {
        router.navigate({ to: path as any, ...routerOptions } as any);
    };

    return <RouterProvider navigate={wrappedNavigate}>{children}</RouterProvider>;
};
