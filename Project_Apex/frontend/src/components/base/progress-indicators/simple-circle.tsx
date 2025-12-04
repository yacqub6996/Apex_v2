import { Box } from "@mui/material";

export const CircleProgressBar = (props: { value: number; min?: 0; max?: 100 }) => {
    const { value, min = 0, max = 100 } = props;
    const percentage = ((value - min) * 100) / (max - min);

    return (
        <Box 
            role="progressbar" 
            aria-valuenow={value} 
            aria-valuemin={min} 
            aria-valuemax={max}
            aria-label={`Progress: ${percentage}%`}
            className="relative flex w-max items-center justify-center"
        >
            <span className="absolute text-sm font-medium text-primary">{percentage}%</span>
            <svg className="size-16 -rotate-90" viewBox="0 0 60 60">
                <circle className="stroke-bg-quaternary" cx="30" cy="30" r="26" fill="none" strokeWidth="6" />
                <Box
                    component="circle"
                    className="stroke-fg-brand-primary"
                    sx={{
                        strokeDashoffset: `calc(100 - ${percentage})`,
                    }}
                    cx="30"
                    cy="30"
                    r="26"
                    fill="none"
                    strokeWidth="6"
                    strokeDasharray="100"
                    pathLength="100"
                    strokeLinecap="round"
                />
            </svg>
        </Box>
    );
};

