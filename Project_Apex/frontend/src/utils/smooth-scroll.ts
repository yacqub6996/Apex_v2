/**
 * Smoothly scrolls to an element with the given ID
 * @param elementId - The ID of the element to scroll to (without the # prefix)
 * @param offset - Optional offset from the top (default: 80px for header height)
 */
export const smoothScrollToElement = (elementId: string, offset: number = 80) => {
    const element = document.getElementById(elementId);
    
    if (!element) {
        console.warn(`Element with ID "${elementId}" not found`);
        return;
    }

    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
};

/**
 * Handles click events for anchor links with smooth scrolling
 * @param event - The click event
 * @param href - The href attribute value (e.g., "#about")
 */
export const handleSmoothScrollClick = (
    event: React.MouseEvent<HTMLAnchorElement>, 
    href: string
) => {
    // Only handle hash links
    if (!href.startsWith('#')) {
        return;
    }

    event.preventDefault();
    
    const elementId = href.substring(1); // Remove the # prefix
    smoothScrollToElement(elementId);
};