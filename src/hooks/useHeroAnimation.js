import { useContext } from 'react'
import HeroAnimationContext from '@/contexts/heroAnimationContextCore'

export default function useHeroAnimation() {
  const ctx = useContext(HeroAnimationContext)
  if (!ctx) {
    throw new Error('useHeroAnimation must be used within HeroAnimationProvider')
  }
  return ctx
}
