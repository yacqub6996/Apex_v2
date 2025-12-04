import { ArrowBack, MenuBook, Code, Chat, Search, FlashOn } from "@mui/icons-material";
import Button from '@mui/material/Button';
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { BackgroundPattern } from "@/components/shared-assets/background-patterns";

export const NotFoundSimple03 = () => {
    return (
        <section className="flex min-h-screen items-center justify-center overflow-hidden bg-primary py-16 md:py-24">
            <div className="mx-auto w-full max-w-container grow px-4 md:px-8">
                <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-8 md:gap-12">
                        <div className="z-10 flex flex-col items-center justify-center gap-4 md:gap-6">
                            <div className="relative">
                                <FeaturedIcon color="gray" theme="modern" size="xl" className="z-10 hidden md:flex" icon={Search} />
                                <FeaturedIcon color="gray" theme="modern" size="lg" className="z-10 md:hidden" icon={Search} />

                                <BackgroundPattern pattern="grid" className="absolute top-1/2 left-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 md:block" />
                                <BackgroundPattern
                                    pattern="grid"
                                    size="md"
                                    className="absolute top-1/2 left-1/2 z-0 -translate-x-1/2 -translate-y-1/2 md:hidden"
                                />
                            </div>

                            <h1 className="z-10 text-display-md font-semibold text-primary md:text-display-lg lg:text-display-xl">Page not found</h1>
                            <p className="z-10 text-lg text-tertiary md:text-xl">
                                The page you are looking for doesn't exist. <br className="max-md:hidden" /> Here are some helpful links:
                            </p>
                        </div>

                        <div className="z-10 flex flex-col-reverse gap-3 self-stretch md:flex-row md:self-auto">
                            <Button size="large" variant="contained" startIcon={<ArrowBack />} onClick={() => window.history.back()}>
                                Go back
                            </Button>
                            <Button size="large" href="/">Take me home</Button>
                        </div>
                    </div>

                    <div className="z-10 md:hidden">
                        <ul className="grid w-full grid-cols-1 justify-items-center gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                {
                                    title: "Documentation",
                                    subtitle: "Dive in to learn all about our product.",
                                    icon: Code,
                                    cta: "Start learning",
                                    href: "#",
                                },
                                {
                                    title: "Our blog",
                                    subtitle: "Read the latest posts on our blog.",
                                    icon: MenuBook,
                                    cta: "View latest posts",
                                    href: "#",
                                },
                                {
                                    title: "Chat to us",
                                    subtitle: "Can't find what you're looking for?",
                                    icon: Chat,
                                    cta: "Chat to our team",
                                    href: "#",
                                },
                            ].map((item) => (
                                <li key={item.title} className="flex max-w-sm flex-col items-center gap-4 text-center">
                                    <FeaturedIcon color="gray" theme="modern" size="md" icon={FlashOn} />

                                    <div className="flex flex-col gap-1 text-center">
                                        <h3 className="text-lg font-semibold text-primary">{item.title}</h3>
                                        <p className="text-md text-tertiary">{item.subtitle}</p>
                                    </div>
                                    <Button size="large" href={item.href} className="size-5" variant="text">
                                        {item.cta}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
};

