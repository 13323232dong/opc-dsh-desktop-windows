export interface ReleaseBrandContractResult {
  productName: string
  appName: string
  applicationPath: string
  iconSha256: string
  logoSha256: string
}

export interface ReleaseBrandContractOverrides {
  contract?: Record<string, unknown>
  packageJson?: Record<string, unknown>
}

export function verifyReleaseBrandContract(
  overrides?: ReleaseBrandContractOverrides
): Promise<ReleaseBrandContractResult>
