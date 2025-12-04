import { alpha, Box, Skeleton, Stack, useTheme } from "@mui/material";

interface TableSkeletonProps {
    rows?: number;
}

interface FormSectionSkeletonProps {
    fields?: number;
}

const useGlassSurface = () => {
    const theme = useTheme();
    const brand = theme.palette.primary.main;
    const paper = theme.palette.background.paper;

    return {
        surface: {
            border: `1px solid ${alpha(brand, 0.2)}`,
            background: `linear-gradient(145deg, ${alpha(paper, 0.82)}, ${alpha(brand, 0.08)})`,
            boxShadow: `0 20px 60px -35px ${alpha(brand, 0.6)}`,
        },
        divider: alpha(brand, 0.16),
    };
};

export const StatCardSkeleton = () => {
    const { surface } = useGlassSurface();

    return (
        <Box
            sx={{
                ...surface,
                borderRadius: 2.5,
                p: 2.5,
                display: "flex",
                flexDirection: "column",
                gap: 1,
            }}
        >
            <Skeleton variant="rectangular" height={12} width="40%" sx={{ borderRadius: 999 }} />
            <Skeleton variant="rectangular" height={28} width="75%" sx={{ borderRadius: 1.5 }} />
            <Skeleton variant="rectangular" height={12} width="55%" sx={{ borderRadius: 999 }} />
        </Box>
    );
};

export const TableSkeleton = ({ rows = 4 }: TableSkeletonProps) => {
    const { surface, divider } = useGlassSurface();

    return (
        <Box sx={{ ...surface, borderRadius: 2, p: 2 }}>
            <Stack spacing={1.5}>
                {[...Array(rows)].map((_, idx) => (
                    <Box
                        key={idx}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 2,
                            borderBottom: idx === rows - 1 ? "none" : `1px solid ${divider}`,
                            pb: idx === rows - 1 ? 0 : 1,
                        }}
                    >
                        <Stack spacing={0.5} sx={{ flex: 1 }}>
                            <Skeleton variant="rectangular" height={12} width="40%" sx={{ borderRadius: 1 }} />
                            <Skeleton variant="rectangular" height={10} width="65%" sx={{ borderRadius: 1 }} />
                        </Stack>
                        <Skeleton variant="rectangular" height={12} width={72} sx={{ borderRadius: 999 }} />
                    </Box>
                ))}
            </Stack>
        </Box>
    );
};

export const FormSectionSkeleton = ({ fields = 3 }: FormSectionSkeletonProps) => {
    const { surface } = useGlassSurface();

    return (
        <Box sx={{ ...surface, borderRadius: 2, p: 2.5 }}>
            <Stack spacing={1.5}>
                {[...Array(fields)].map((_, idx) => (
                    <Stack key={idx} spacing={0.5}>
                        <Skeleton variant="rectangular" height={12} width="30%" sx={{ borderRadius: 1 }} />
                        <Skeleton variant="rectangular" height={44} width="100%" sx={{ borderRadius: 1 }} />
                    </Stack>
                ))}
                <Skeleton variant="rectangular" height={40} width={148} sx={{ borderRadius: 999, alignSelf: "flex-end" }} />
            </Stack>
        </Box>
    );
};
