import { motion } from "motion/react";
import { SignupSplitCarousel } from "@/components/shared-assets/signup/signup-split-carousel";

export const Signup = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <SignupSplitCarousel />
        </motion.div>
    );
};
