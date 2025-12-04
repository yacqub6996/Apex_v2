import type { HTMLAttributes } from "react";
import { BoxIllustration } from "./box";
import { CloudIllustration } from "./cloud";
import { CreditCardIllustration } from "./credit-card";
import { DocumentsIllustration } from "./documents";

const types = {
    box: BoxIllustration,
    cloud: CloudIllustration,
    documents: DocumentsIllustration,
    "credit-card": CreditCardIllustration,
};

export interface IllustrationProps extends HTMLAttributes<HTMLDivElement> {
    size?: "sm" | "md" | "lg";
    svgClassName?: string;
    childrenClassName?: string;
}

type IllustrationType = "box" | "cloud" | "documents" | "credit-card";

export const Illustration = (props: IllustrationProps & { type: IllustrationType }) => {
    const { type } = props;

    const Component = types[type];

    return <Component {...props} />;
};

