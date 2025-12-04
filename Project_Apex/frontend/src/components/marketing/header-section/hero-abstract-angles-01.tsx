import type { ComponentProps } from "react";
import { ArrowForward } from "@mui/icons-material";;
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { VideoPlayer } from "@/components/base/video-player/video-player";
import { Header } from "@/components/marketing/header-navigation/header";
import { BackgroundStripes } from "./base-components/background-stripes";

const HeaderPrimary = (props: ComponentProps<typeof Header>) => {
    return (
        <Header
            {...props}
            className="bg-utility-brand-50_alt [&_nav>ul>li>a]:text-brand-primary [&_nav>ul>li>a]:hover:text-brand-primary [&_nav>ul>li>button]:text-brand-primary [&_nav>ul>li>button]:hover:text-brand-primary [&_nav>ul>li>button>svg]:text-fg-brand-secondary_alt"
        />
    );
};

export const HeroAbstractAngles01 = () => {
    return (
        <div className="bg-primary">
            <HeaderPrimary />
            <section>
                <div className="flex flex-col items-center bg-utility-brand-50_alt pt-16 md:pt-24">
                    <div className="mx-auto flex w-full max-w-container flex-col px-4 md:px-8">
                        <div className="flex flex-col items-start sm:items-center sm:text-center">
                            <a href="#" className="rounded-full outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="Check out the new team dashboard feature">
                                <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
                                    <Chip
                                        label="New feature"
                                        color="primary"
                                        size="small"
                                        sx={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'primary.main',
                                            fontWeight: 600
                                        }}
                                    />
                                    <Chip
                                        label="Check out the team dashboard"
                                        color="primary"
                                        size="medium"
                                        icon={<ArrowForward />}
                                        sx={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'primary.main',
                                            fontWeight: 600
                                        }}
                                    />
                                </Box>
                                <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
                                    <Chip
                                        label="New feature"
                                        color="primary"
                                        size="small"
                                        sx={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'primary.main',
                                            fontWeight: 600
                                        }}
                                    />
                                    <Chip
                                        label="Check out the team dashboard"
                                        color="primary"
                                        size="small"
                                        icon={<ArrowForward />}
                                        sx={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'primary.main',
                                            fontWeight: 600
                                        }}
                                    />
                                </Box>
                            </a>

                            <h1 className="mt-4 text-display-md font-semibold text-brand-primary md:text-display-lg lg:text-display-xl">
                                High-performing remote teams. <br /> The future of work.
                            </h1>
                            <p className="mt-4 max-w-3xl text-lg text-brand-secondary md:mt-6 md:text-xl">
                                Powerful, self-serve team engagement tools and analytics. Supercharge your managers & keep employees engaged from anywhere.
                            </p>
                            <div className="relative z-1 mt-8 flex w-full flex-col-reverse items-stretch gap-3 sm:w-auto sm:flex-row sm:items-start md:mt-12">
                                <Button size="large" variant="contained" startIcon="PlayCircle">
                                    Demo
                                </Button>
                                <Button size="large">Sign up</Button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative pt-16">
                    <BackgroundStripes />
                </div>

                <div className="relative pb-16 md:pb-24">
                    <div className="mx-auto w-full max-w-container px-4 md:px-8">
                        <div className="flex justify-center">
                            <VideoPlayer
                                thumbnailUrl="https://www.untitledui.com/marketing/video-thumbnail.webp"
                                src="https://www.untitledui.com/videos/untitled-ui-demo.mp4"
                                className="aspect-video w-full overflow-hidden rounded-xl shadow-3xl md:max-w-240"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

