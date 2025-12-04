import Avatar from "@mui/material/Avatar";
import { useEffect, useMemo, useState } from "react";

type Testimonial = {
  name: string;
  role: string;
  company: string;
  avatar: string;
  content: string;
};

const testimonials: Testimonial[] = [
  {
    name: "Sarah Chen",
    role: "Portfolio Manager",
    company: "Horizon Capital",
    avatar: "https://i.pravatar.cc/150?img=5",
    content: "Guardrails and transparent trade logs make copy trading operationally simple.",
  },
  {
    name: "Marcus Rodriguez",
    role: "Chief Investment Officer",
    company: "Alpha Ventures",
    avatar: "https://i.pravatar.cc/150?img=12",
    content: "Structured plan ranges and ROI exports keep our long-term allocations organized.",
  },
  {
    name: "Leah Kim",
    role: "Private Investor",
    company: "Apex Community",
    avatar: "https://i.pravatar.cc/150?img=18",
    content: "Pausing and reducing allocations works instantly, and reporting stays consistent.",
  },
];

const ROTATE_MS = 1000 * 60 * 60 * 2; // 2 hours

export const TestimonialsRotating = () => {
  const startIndex = useMemo(() => Math.floor(Date.now() / ROTATE_MS) % testimonials.length, [testimonials.length]);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % testimonials.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [testimonials.length]);

  const t = testimonials[index];

  return (
    <section id="testimonials" className="bg-primary py-6 md:py-10">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <figure className="flex flex-col gap-6 rounded-2xl bg-brand-section px-6 py-10 text-center text-balance md:gap-8 md:px-8 md:py-12 lg:p-16">
          <div className="flex flex-col gap-3">
            <blockquote className="text-display-xs font-medium text-primary_on-brand sm:text-display-sm md:text-display-md">
              “{t.content}”
            </blockquote>
          </div>
          <figcaption className="flex justify-center">
            <div className="flex flex-col items-center gap-4">
              <Avatar src={t.avatar} alt={t.name} sx={{ width: 56, height: 56 }} />
              <div className="flex flex-col gap-1">
                <p className="text-md font-semibold text-primary_on-brand">{t.name}</p>
                <cite className="text-sm text-tertiary_on-brand not-italic">{t.role}, {t.company}</cite>
              </div>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
};

