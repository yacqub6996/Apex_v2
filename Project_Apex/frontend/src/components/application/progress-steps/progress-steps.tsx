import { FC } from "react";
import { ProgressFeaturedIconType } from "./progress-types";
import {
  IconTop,
  IconLeft,
  IconTopNumber,
  IconLeftNumber,
  FeaturedIconTop,
  FeaturedIconLeft,
  TextLine
} from "./step-base";

interface ProgressStepsProps {
  type?: "featured-icon" | "text" | "line" | "icon";
  size?: "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  items: ProgressFeaturedIconType[];
}

const StepBase: FC<any> = ({ type, size, orientation, ...item }) => {
  const commonProps = { ...item, size, orientation };
  
  switch (type) {
    case "featured-icon":
      return orientation === "horizontal" ?
        <FeaturedIconTop {...commonProps} /> :
        <FeaturedIconLeft {...commonProps} />;
    case "icon":
      return orientation === "horizontal" ?
        <IconTop {...commonProps} /> :
        <IconLeft {...commonProps} />;
    case "number":
      return orientation === "horizontal" ?
        <IconTopNumber {...commonProps} step={item.step || 1} /> :
        <IconLeftNumber {...commonProps} step={item.step || 1} />;
    case "line":
      return <TextLine {...commonProps} />;
    default:
      return <TextLine {...commonProps} />;
  }
};

const ProgressSteps: FC<ProgressStepsProps> = ({ type = "text", size = "md", orientation = "horizontal", items }) => {
  return (
    <div className={`flex ${orientation === "vertical" ? "flex-col" : "flex-row"} gap-4`}>
      {items.map((item, index) => (
        <StepBase
          key={index}
          {...item}
          type={type}
          size={size}
          orientation={orientation}
          isLast={index === items.length - 1}
        />
      ))}
    </div>
  );
};

export const Progress = {
  IconsWithText: (props: ProgressStepsProps) => <ProgressSteps type="featured-icon" {...props} />,
  TextWithLine: (props: ProgressStepsProps) => <ProgressSteps type="line" {...props} />,
};
