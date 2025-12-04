import { motion } from "motion/react";
import { LoginSplitCarousel } from "@/components/shared-assets/login/login-split-carousel";

export const Login = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <LoginSplitCarousel />
        </motion.div>
    );
};
