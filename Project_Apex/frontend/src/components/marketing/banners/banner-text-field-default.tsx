import { Mail } from "@mui/icons-material";
import Button from '@mui/material/Button';
import { CloseButton } from "@/components/base/buttons/close-button";
import { Form } from "@/components/base/form/form";
import { TextField } from "@mui/material";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { useState } from "react";

export const BannerTextFieldDefault = () => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) {
        return null;
    }

    return (
        <div className="relative mx-2 mb-4 flex flex-col gap-4 rounded-xl bg-secondary_subtle p-4 shadow-lg ring-1 ring-primary ring-inset md:m-0 md:flex-row md:items-center md:gap-3 md:p-3">
            <div className="flex flex-1 items-center gap-4 md:w-0">
                <FeaturedIcon className="hidden md:flex" icon={Mail} color="gray" theme="modern" size="lg" />
                <div className="flex flex-col gap-0.5 overflow-auto">
                    <p className="pr-8 text-md font-semibold text-secondary md:truncate md:pr-0">
                        Stay up to date with the latest news <span className="hidden md:inline">and updates</span>
                    </p>
                    <p className="text-md text-tertiary md:truncate">Lorem ipsum dolor sit amet consectetur odio nunc adipiscing viverra.</p>
                </div>
            </div>

            <div className="flex gap-2">
                <Form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const data = Object.fromEntries(new FormData(e.currentTarget));
                        console.log("Form data:", data);
                    }}
                    className="flex flex-1 flex-col gap-3 md:w-100 md:flex-row md:gap-4"
                >
                    <TextField
                      required
                      size="medium"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      variant="outlined"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <Button type="submit" size="large" variant="contained">
                        Subscribe
                    </Button>
                </Form>
                <div className="absolute top-2 right-2 flex shrink-0 items-center justify-center md:static">
                    <CloseButton size="md" label="Dismiss" onClick={() => setIsVisible(false)} />
                </div>
            </div>
        </div>
    );
};

