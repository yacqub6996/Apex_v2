import { MenuBook, Code, Help, PlayCircle, Star } from "@mui/icons-material";
import Button from '@mui/material/Button';
import { NavMenuItemLink } from "./base-components/nav-menu-item";

const items = [
    {
        title: "Blog",
        subtitle: "The latest industry new and guides curated by our expert team.",
        href: "/blog",
        Icon: MenuBook,
    },
    {
        title: "Customer stories",
        subtitle: "Learn how our customers are using Apex Trading to 10x their growth.",
        href: "/customer-stories",
        Icon: Star,
    },
    {
        title: "Video tutorials",
        subtitle: "Get up and running on our newest features and in-depth guides.",
        href: "/tutorials",
        Icon: PlayCircle,
    },
    {
        title: "Documentation",
        subtitle: "In-depth articles on our tools and technologies to empower teams.",
        href: "/docs",
        Icon: Code,
    },
    {
        title: "Help and support",
        subtitle: "Need help with something? Our expert team is here to help 24/7.",
        href: "/help",
        Icon: Help,
    },
];

export const DropdownMenuSimpleWithFooter = () => {
    return (
        <div className="px-3 pb-2 md:max-w-84 md:p-0">
            <nav className="overflow-hidden rounded-xl bg-secondary shadow-xs ring-1 ring-secondary_alt md:rounded-2xl md:shadow-lg">
                <ul className="flex flex-col gap-0.5 rounded-xl bg-primary py-2 ring-1 ring-secondary md:rounded-t-2xl md:p-2">
                    {items.map(({ title, subtitle, href, Icon }) => (
                        <li key={title}>
                            <NavMenuItemLink icon={Icon} title={title} subtitle={subtitle} href={href} />
                        </li>
                    ))}
                </ul>
                <div className="px-4 py-5 text-center sm:px-5">
                    <Button href="#" size="large" variant="text">
                        All resources
                    </Button>
                </div>
            </nav>
        </div>
    );
};


