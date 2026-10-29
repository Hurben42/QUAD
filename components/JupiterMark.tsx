/** Jupiter's logo, unmodified (public/brand/jupiter-logo.svg): Get HYPE swaps on Jupiter. */
export function JupiterMark({ size = 18 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/jupiter-logo.svg" alt="" width={size} height={size} style={{ display: 'block', flex: 'none' }} />;
}
