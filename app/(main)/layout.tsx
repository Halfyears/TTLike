// Pass-through layout — navigation is handled by (marketing)/layout.tsx
// and (app-pages)/layout.tsx sub-group layouts.
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
