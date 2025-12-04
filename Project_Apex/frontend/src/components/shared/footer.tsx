import { Box, Typography, Container } from "@mui/material";

export interface FooterProps {
  /**
   * Optional maximum width constraint
   */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  
  /**
   * Optional additional padding
   */
  py?: number;
}

/**
 * Footer - A consistent footer component for the application
 * 
 * Displays copyright information at the bottom of the page.
 * Uses theme tokens for consistent styling across light and dark modes.
 * 
 * Example usage:
 * ```tsx
 * <Footer maxWidth="xl" />
 * ```
 */
export const Footer = ({ maxWidth = "xl", py = 3 }: FooterProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py,
        mt: "auto",
        borderTop: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Container maxWidth={maxWidth}>
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
        >
          © {currentYear} Apex Trading Platform. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};
