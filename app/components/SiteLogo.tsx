'use client'
import { useTheme } from '../lib/theme'

interface Props {
  height?: number | string
  style?: React.CSSProperties
}

export function SiteLogo({ height = 36, style }: Props) {
  const { theme } = useTheme()
  const src = theme === 'light' ? '/worldlocalbanklogo-light.png' : '/worldlocalbanklogo.png'
  return (
    <img
      src={src}
      alt="uBTC"
      style={{ height, objectFit: 'contain', transition: 'opacity 0.2s ease', ...style }}
    />
  )
}

export function WLBLogo({ height = 32, style }: Props) {
  const { theme } = useTheme()
  const src = theme === 'light' ? '/wlb-light.png' : '/wlb.png'
  return (
    <img
      src={src}
      alt="uBTC"
      style={{ height, objectFit: 'contain', transition: 'opacity 0.2s ease', ...style }}
    />
  )
}
