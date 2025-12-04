import "@testing-library/jest-dom/vitest";

// Silence React Router navigation attempts during tests.
// Mock for React Router during tests
// @ts-expect-error - importOriginal is injected by vitest
vi.mock("@tanstack/react-router", async (importOriginal: any) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ navigate: () => Promise.resolve() }),
  };
});
