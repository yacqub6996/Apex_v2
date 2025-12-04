import type { ComponentPropsWithRef, FormEvent } from "react";
import { Form as AriaForm } from "react-aria-components";

/**
 * Wrapper over react-aria Form that guarantees default submit is prevented,
 * so pages don't reload on errors and our handlers can show inline messages.
 */
export const Form = ({ onSubmit, ...rest }: ComponentPropsWithRef<typeof AriaForm>) => {
    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        // Always prevent native navigation/reload
        e.preventDefault();
        // Call consumer handler if provided
        if (typeof onSubmit === "function") {
            // react-aria passes a compatible event; cast to satisfy TS
            // Consumers can still access FormData via e.currentTarget
            (onSubmit as unknown as (e: FormEvent<HTMLFormElement>) => void)(e);
        }
    };

        return (
            <AriaForm onSubmit={handleSubmit} {...rest} />
        );
};

Form.displayName = "Form";

