// Lucide publishes declarations at its package root, but not for its ESM files.
declare module 'lucide-react/dist/esm/icons/*.js' {
  import type { LucideIcon } from 'lucide-react'
  const icon: LucideIcon
  export default icon
}
