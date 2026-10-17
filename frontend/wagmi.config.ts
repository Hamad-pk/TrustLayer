import { defineConfig } from '@wagmi/cli'
import { foundry } from '@wagmi/cli/plugins'

export default defineConfig({
  out: 'src/generated.ts',
  plugins: [
    foundry({
      project: '..',
      include: ['TrustLayer.sol/**'],
      forge: { build: false }, // run `forge build` yourself first
      deployments: {
        TrustLayer: {
          11155111: '0x6A348ebd89B3C8fB63E1CcAb4f2F84DB360f9299',
        },
      },
    }),
  ],
})