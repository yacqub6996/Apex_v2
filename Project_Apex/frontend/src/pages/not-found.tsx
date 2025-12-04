import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "@tanstack/react-router";
import {
    Box,
    Button,
    Container,
    Stack,
    Typography,
} from "@mui/material";

export function NotFound() {
    const navigate = useNavigate();

        return (
            <Box
                component="section"
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: { xs: "flex-start", md: "center" },
                    py: { xs: 8, md: 12 },
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                }}
         >
                <Container maxWidth="md">
                    <Stack spacing={{ xs: 4, md: 6 }}>
                        <Stack spacing={{ xs: 2, md: 3 }}>
                            <Stack spacing={1}>
                                <Typography
                                    variant="overline"
                                    sx={{ fontWeight: 600 }}
                                    color="secondary.light"
                                >
                                    404 error
                                </Typography>
                                <Typography
                                    component="h1"
                                    variant="h3"
                                    sx={{
                                        fontWeight: 600,
                                        color: "inherit",
                                        fontSize: { xs: 28, md: 36, lg: 44 },
                                        lineHeight: 1.2,
                                    }}
                                >
                                    We can’t find that page
                                </Typography>
                            </Stack>
                            <Typography
                                variant="body1"
                                sx={{ color: "primary.contrastText", opacity: 0.9, fontSize: { xs: 16, md: 18 } }}
                            >
                                Sorry, the page you are looking for doesn't exist or has been moved.
                            </Typography>
                        </Stack>

                        <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1.5}>
                            <Button
                                size="large"
                                variant="contained"
                                color="secondary"
                                startIcon={<ArrowBackIcon />}
                                onClick={() => window.history.back()}
                            >
                                Go back
                            </Button>
                            <Button size="large" variant="outlined" color="inherit" onClick={() => navigate({ to: "/" })}>
                                Take me home
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Box>
        );
}
